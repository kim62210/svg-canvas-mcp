/**
 * SVG 문서 관리자
 * 캔버스 상태, 요소, defs 등 전체 SVG 문서를 관리
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type {
  SVGDocument,
  SVGElement,
  CanvasConfig,
  ViewBox,
  Gradient,
  Pattern,
  Filter,
  Symbol,
  SVGMetadata,
  PathElement
} from '../types/index.js';
import {
  documentToSVG,
  minifySVG,
  viewBoxToString,
  parseViewBox
} from '../utils/svg-parser.js';
import { resetCounters, syncCountersFromIds } from './id-generator.js';
import { cloneElement } from './element.js';

// 문서 이벤트 타입
export type DocumentEventType =
  | 'element-added'
  | 'element-removed'
  | 'element-updated'
  | 'canvas-changed'
  | 'defs-changed';

export interface DocumentEvent {
  type: DocumentEventType;
  elementId?: string;
  data?: unknown;
}

export type DocumentEventListener = (event: DocumentEvent) => void;

/**
 * SVG 문서 관리자 클래스
 */
export class SVGDocumentManager {
  private document: SVGDocument;
  private filePath: string | null = null;
  private isDirty: boolean = false;
  private listeners: DocumentEventListener[] = [];

  constructor(config?: Partial<CanvasConfig>) {
    this.document = this.createEmptyDocument(config);
  }

  /**
   * 빈 문서 생성
   */
  private createEmptyDocument(config?: Partial<CanvasConfig>): SVGDocument {
    resetCounters();

    const defaultConfig: CanvasConfig = {
      width: 800,
      height: 600,
      viewBox: { minX: 0, minY: 0, width: 800, height: 600 },
      background: undefined
    };

    return {
      config: { ...defaultConfig, ...config },
      defs: {
        gradients: [],
        patterns: [],
        filters: [],
        symbols: [],
        clipPaths: [],
        masks: []
      },
      elements: []
    };
  }

  /**
   * 새 캔버스 생성
   */
  create(width: number, height: number, options: {
    viewBox?: string;
    background?: string;
    preserveAspectRatio?: string;
  } = {}): void {
    const viewBox = options.viewBox
      ? parseViewBox(options.viewBox)
      : { minX: 0, minY: 0, width, height };

    this.document = this.createEmptyDocument({
      width,
      height,
      viewBox: viewBox || undefined,
      background: options.background,
      preserveAspectRatio: options.preserveAspectRatio
    });

    this.filePath = null;
    this.isDirty = false;
    this.emit({ type: 'canvas-changed' });
  }

  /**
   * SVG 파일 열기
   */
  async open(filePath: string): Promise<void> {
    const content = await fs.readFile(filePath, 'utf-8');

    // 간단한 SVG 파싱 (실제로는 svgson 등 사용)
    // 여기서는 기본적인 속성만 추출
    const widthMatch = content.match(/width="(\d+)"/);
    const heightMatch = content.match(/height="(\d+)"/);
    const viewBoxMatch = content.match(/viewBox="([^"]+)"/);

    const width = widthMatch ? parseInt(widthMatch[1]) : 800;
    const height = heightMatch ? parseInt(heightMatch[1]) : 600;
    const viewBox = viewBoxMatch ? parseViewBox(viewBoxMatch[1]) : null;

    // 메타데이터 파일 확인
    const metaPath = filePath.replace(/\.svg$/, '.svgmeta.json');
    let metadata: SVGMetadata | null = null;

    try {
      const metaContent = await fs.readFile(metaPath, 'utf-8');
      metadata = JSON.parse(metaContent);
    } catch {
      // 메타데이터 없음
    }

    this.document = this.createEmptyDocument({
      width,
      height,
      viewBox: viewBox || undefined,
      background: metadata?.canvas?.background
    });

    this.filePath = filePath;
    this.isDirty = false;

    // ID 카운터 동기화
    if (metadata) {
      const allIds = this.document.elements.map(el => el.id);
      syncCountersFromIds(allIds);
    }

    this.emit({ type: 'canvas-changed' });
  }

  /**
   * 현재 문서 저장
   */
  async save(filePath?: string): Promise<string> {
    const savePath = filePath || this.filePath;
    if (!savePath) {
      throw new Error('저장 경로가 지정되지 않았습니다.');
    }

    // SVG 파일 저장
    const svgContent = documentToSVG(this.document, true);
    await fs.writeFile(savePath, svgContent, 'utf-8');

    // 메타데이터 저장
    const metadata: SVGMetadata = {
      version: '1.0',
      canvas: {
        width: this.document.config.width,
        height: this.document.config.height,
        viewBox: this.document.config.viewBox
          ? viewBoxToString(this.document.config.viewBox)
          : `0 0 ${this.document.config.width} ${this.document.config.height}`,
        background: this.document.config.background
      },
      layers: [], // LayerManager에서 관리
      symbols: {},
      history: {
        current: 0,
        entries: []
      }
    };

    const metaPath = savePath.replace(/\.svg$/, '.svgmeta.json');
    await fs.writeFile(metaPath, JSON.stringify(metadata, null, 2), 'utf-8');

    this.filePath = savePath;
    this.isDirty = false;

    return savePath;
  }

  /**
   * SVG 코드 내보내기
   */
  exportSVG(options: { minify?: boolean; pretty?: boolean } = {}): string {
    let svg = documentToSVG(this.document, options.pretty !== false);

    // rawDefs 삽입 (있는 경우)
    if (this.rawDefs.length > 0) {
      const rawDefsContent = this.rawDefs.join('\n');
      // 기존 defs가 있으면 그 안에 추가, 없으면 새로 생성
      if (svg.includes('</defs>')) {
        svg = svg.replace('</defs>', `${rawDefsContent}\n  </defs>`);
      } else {
        // defs가 없으면 svg 태그 바로 다음에 추가
        svg = svg.replace(
          /(<svg[^>]*>)/,
          `$1\n  <defs>\n${rawDefsContent}\n  </defs>`
        );
      }
    }

    // rawElements 삽입 (있는 경우)
    if (this.rawElements.length > 0) {
      const rawElementsContent = this.rawElements.join('\n');
      // </svg> 바로 앞에 추가
      svg = svg.replace('</svg>', `${rawElementsContent}\n</svg>`);
    }

    return options.minify ? minifySVG(svg) : svg;
  }

  // ============ 캔버스 관리 ============

  /**
   * 캔버스 정보 조회
   */
  getCanvasInfo(): CanvasConfig & { elementCount: number; filePath: string | null; isDirty: boolean } {
    return {
      ...this.document.config,
      elementCount: this.document.elements.length,
      filePath: this.filePath,
      isDirty: this.isDirty
    };
  }

  /**
   * 캔버스 크기 변경
   */
  resize(width: number, height: number, scaleContent: boolean = false): void {
    const oldWidth = this.document.config.width;
    const oldHeight = this.document.config.height;

    this.document.config.width = width;
    this.document.config.height = height;

    if (this.document.config.viewBox) {
      this.document.config.viewBox.width = width;
      this.document.config.viewBox.height = height;
    }

    if (scaleContent && oldWidth > 0 && oldHeight > 0) {
      const scaleX = width / oldWidth;
      const scaleY = height / oldHeight;
      // 요소 스케일링은 추후 구현
    }

    this.isDirty = true;
    this.emit({ type: 'canvas-changed' });
  }

  /**
   * 배경색 설정
   */
  setBackground(color: string | undefined): void {
    this.document.config.background = color;
    this.isDirty = true;
    this.emit({ type: 'canvas-changed' });
  }

  // ============ 요소 관리 ============

  /**
   * 요소 추가
   */
  addElement(element: SVGElement): string {
    this.document.elements.push(element);
    this.isDirty = true;
    this.emit({ type: 'element-added', elementId: element.id });
    return element.id;
  }

  /**
   * 요소 ID로 조회
   */
  getElementById(id: string): SVGElement | null {
    return this.findElement(this.document.elements, id);
  }

  /**
   * 재귀적 요소 검색
   */
  private findElement(elements: SVGElement[], id: string): SVGElement | null {
    for (const el of elements) {
      if (el.id === id) return el;
      if (el.type === 'g') {
        const found = this.findElement(el.children, id);
        if (found) return found;
      }
    }
    return null;
  }

  /**
   * 요소 업데이트
   */
  updateElement(id: string, updates: Partial<SVGElement>): boolean {
    const element = this.getElementById(id);
    if (!element) return false;

    Object.assign(element, updates);
    this.isDirty = true;
    this.emit({ type: 'element-updated', elementId: id });
    return true;
  }

  /**
   * 요소 삭제
   */
  removeElement(id: string): boolean {
    const removed = this.removeFromArray(this.document.elements, id);
    if (removed) {
      this.isDirty = true;
      this.emit({ type: 'element-removed', elementId: id });
    }
    return removed;
  }

  /**
   * 배열에서 요소 재귀 삭제
   */
  private removeFromArray(elements: SVGElement[], id: string): boolean {
    const index = elements.findIndex(el => el.id === id);
    if (index !== -1) {
      elements.splice(index, 1);
      return true;
    }

    for (const el of elements) {
      if (el.type === 'g') {
        if (this.removeFromArray(el.children, id)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * 모든 요소 조회
   */
  getAllElements(): SVGElement[] {
    return [...this.document.elements];
  }

  /**
   * 요소 복제
   */
  duplicateElement(id: string, offset: { x: number; y: number } = { x: 10, y: 10 }): string | null {
    const element = this.getElementById(id);
    if (!element) return null;

    const clone = cloneElement(element);

    // 위치 오프셋 적용
    if ('x' in clone && typeof clone.x === 'number') {
      (clone as { x: number }).x += offset.x;
    }
    if ('y' in clone && typeof clone.y === 'number') {
      (clone as { y: number }).y += offset.y;
    }
    if ('cx' in clone && typeof clone.cx === 'number') {
      (clone as { cx: number }).cx += offset.x;
    }
    if ('cy' in clone && typeof clone.cy === 'number') {
      (clone as { cy: number }).cy += offset.y;
    }

    return this.addElement(clone);
  }

  /**
   * 요소 순서 변경 (앞으로/뒤로)
   */
  reorderElement(id: string, direction: 'front' | 'back' | 'forward' | 'backward'): boolean {
    const index = this.document.elements.findIndex(el => el.id === id);
    if (index === -1) return false;

    const element = this.document.elements[index];
    this.document.elements.splice(index, 1);

    switch (direction) {
      case 'front':
        this.document.elements.push(element);
        break;
      case 'back':
        this.document.elements.unshift(element);
        break;
      case 'forward':
        this.document.elements.splice(Math.min(index + 1, this.document.elements.length), 0, element);
        break;
      case 'backward':
        this.document.elements.splice(Math.max(index - 1, 0), 0, element);
        break;
    }

    this.isDirty = true;
    this.emit({ type: 'element-updated', elementId: id });
    return true;
  }

  // ============ Defs 관리 ============

  /**
   * Gradient 추가
   */
  addGradient(gradient: Gradient): string {
    this.document.defs.gradients.push(gradient);
    this.isDirty = true;
    this.emit({ type: 'defs-changed' });
    return gradient.id;
  }

  /**
   * Gradient 조회
   */
  getGradient(id: string): Gradient | null {
    return this.document.defs.gradients.find(g => g.id === id) || null;
  }

  /**
   * Pattern 추가
   */
  addPattern(pattern: Pattern): string {
    this.document.defs.patterns.push(pattern);
    this.isDirty = true;
    this.emit({ type: 'defs-changed' });
    return pattern.id;
  }

  /**
   * Filter 추가
   */
  addFilter(filter: Filter): string {
    this.document.defs.filters.push(filter);
    this.isDirty = true;
    this.emit({ type: 'defs-changed' });
    return filter.id;
  }

  /**
   * Symbol 추가
   */
  addSymbol(symbol: Symbol): string {
    this.document.defs.symbols.push(symbol);
    this.isDirty = true;
    this.emit({ type: 'defs-changed' });
    return symbol.id;
  }

  /**
   * Symbol 조회
   */
  getSymbol(id: string): Symbol | null {
    return this.document.defs.symbols.find(s => s.id === id) || null;
  }

  /**
   * ClipPath 추가
   */
  addClipPath(clipPath: PathElement): string {
    this.document.defs.clipPaths.push(clipPath);
    this.isDirty = true;
    this.emit({ type: 'defs-changed' });
    return clipPath.id;
  }

  // ============ Raw Content 관리 ============

  // Raw defs 저장소 (문자열 형태의 defs)
  private rawDefs: string[] = [];

  // Raw elements 저장소 (문자열 형태의 elements)
  private rawElements: string[] = [];

  /**
   * Raw SVG defs 추가 (그라디언트, 필터, 마커 등의 문자열)
   */
  addDefs(content: string): void {
    // 중복 방지 (ID 기반)
    const idMatch = content.match(/id="([^"]+)"/);
    if (idMatch) {
      const id = idMatch[1];
      this.rawDefs = this.rawDefs.filter(d => !d.includes(`id="${id}"`));
    }
    this.rawDefs.push(content);
    this.isDirty = true;
    this.emit({ type: 'defs-changed' });
  }

  /**
   * Raw defs 제거
   */
  removeDefs(idOrPattern: string): boolean {
    const before = this.rawDefs.length;
    this.rawDefs = this.rawDefs.filter(d => !d.includes(`id="${idOrPattern}"`));
    if (this.rawDefs.length !== before) {
      this.isDirty = true;
      this.emit({ type: 'defs-changed' });
      return true;
    }
    return false;
  }

  /**
   * Raw SVG 요소 추가 (문자열 형태)
   */
  addRawElement(content: string): void {
    this.rawElements.push(content);
    this.isDirty = true;
    this.emit({ type: 'element-added' });
  }

  /**
   * Raw defs 조회
   */
  getRawDefs(): string[] {
    return [...this.rawDefs];
  }

  /**
   * Raw elements 조회
   */
  getRawElements(): string[] {
    return [...this.rawElements];
  }

  /**
   * 너비 getter
   */
  get width(): number {
    return this.document.config.width;
  }

  /**
   * 높이 getter
   */
  get height(): number {
    return this.document.config.height;
  }

  // ============ 이벤트 관리 ============

  /**
   * 이벤트 리스너 등록
   */
  addEventListener(listener: DocumentEventListener): void {
    this.listeners.push(listener);
  }

  /**
   * 이벤트 리스너 제거
   */
  removeEventListener(listener: DocumentEventListener): void {
    const index = this.listeners.indexOf(listener);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * 이벤트 발생
   */
  private emit(event: DocumentEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  // ============ 직렬화 ============

  /**
   * 문서 상태를 JSON으로 내보내기
   */
  toJSON(): SVGDocument {
    return JSON.parse(JSON.stringify(this.document));
  }

  /**
   * JSON에서 문서 상태 복원
   */
  fromJSON(data: SVGDocument): void {
    this.document = JSON.parse(JSON.stringify(data));
    this.isDirty = true;

    // ID 카운터 동기화
    const allIds = this.collectAllIds(this.document.elements);
    syncCountersFromIds(allIds);

    this.emit({ type: 'canvas-changed' });
  }

  /**
   * 모든 ID 수집
   */
  private collectAllIds(elements: SVGElement[]): string[] {
    const ids: string[] = [];
    for (const el of elements) {
      ids.push(el.id);
      if (el.type === 'g') {
        ids.push(...this.collectAllIds(el.children));
      }
    }
    return ids;
  }
}

// 싱글톤 인스턴스 (현재 활성 문서)
let currentDocument: SVGDocumentManager | null = null;

/**
 * 현재 문서 가져오기 (없으면 생성)
 */
export function getCurrentDocument(): SVGDocumentManager {
  if (!currentDocument) {
    currentDocument = new SVGDocumentManager();
  }
  return currentDocument;
}

/**
 * 새 문서로 교체
 */
export function setCurrentDocument(doc: SVGDocumentManager): void {
  currentDocument = doc;
}

/**
 * 현재 문서 초기화
 */
export function resetCurrentDocument(): void {
  currentDocument = null;
}

/**
 * 새 문서 생성 (편의 함수)
 * 기존 문서를 초기화하고 새 캔버스를 생성합니다.
 */
export function createDocument(width: number, height: number, background?: string): SVGDocumentManager {
  const doc = getCurrentDocument();
  doc.create(width, height, { background });
  return doc;
}
