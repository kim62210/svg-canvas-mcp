/**
 * SVG 요소 추상화 및 팩토리
 */

import type {
  SVGElement,
  RectElement,
  CircleElement,
  EllipseElement,
  LineElement,
  PolylineElement,
  PolygonElement,
  PathElement,
  TextElement,
  TextPathElement,
  ImageElement,
  GroupElement,
  UseElement,
  Point,
  Color
} from '../types/index.js';
import { generateId } from './id-generator.js';

// 요소 생성 공통 옵션
export interface ElementOptions {
  id?: string;
  class?: string;
  fill?: Color | string;
  stroke?: Color | string;
  strokeWidth?: number;
  opacity?: number;
  transform?: string;
  ariaLabel?: string;
}

/**
 * 사각형 요소 생성
 */
export function createRect(
  x: number,
  y: number,
  width: number,
  height: number,
  options: ElementOptions & { rx?: number; ry?: number } = {}
): RectElement {
  return {
    type: 'rect',
    id: options.id || generateId('rect'),
    x,
    y,
    width,
    height,
    rx: options.rx,
    ry: options.ry,
    class: options.class,
    fill: options.fill,
    stroke: options.stroke,
    strokeWidth: options.strokeWidth,
    opacity: options.opacity,
    transform: options.transform,
    ariaLabel: options.ariaLabel
  };
}

/**
 * 원 요소 생성
 */
export function createCircle(
  cx: number,
  cy: number,
  r: number,
  options: ElementOptions = {}
): CircleElement {
  return {
    type: 'circle',
    id: options.id || generateId('circle'),
    cx,
    cy,
    r,
    class: options.class,
    fill: options.fill,
    stroke: options.stroke,
    strokeWidth: options.strokeWidth,
    opacity: options.opacity,
    transform: options.transform,
    ariaLabel: options.ariaLabel
  };
}

/**
 * 타원 요소 생성
 */
export function createEllipse(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  options: ElementOptions = {}
): EllipseElement {
  return {
    type: 'ellipse',
    id: options.id || generateId('ellipse'),
    cx,
    cy,
    rx,
    ry,
    class: options.class,
    fill: options.fill,
    stroke: options.stroke,
    strokeWidth: options.strokeWidth,
    opacity: options.opacity,
    transform: options.transform,
    ariaLabel: options.ariaLabel
  };
}

/**
 * 선 요소 생성
 */
export function createLine(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  options: ElementOptions = {}
): LineElement {
  return {
    type: 'line',
    id: options.id || generateId('line'),
    x1,
    y1,
    x2,
    y2,
    class: options.class,
    fill: options.fill,
    stroke: options.stroke || '#000000',
    strokeWidth: options.strokeWidth || 1,
    opacity: options.opacity,
    transform: options.transform,
    ariaLabel: options.ariaLabel
  };
}

/**
 * 연결선 요소 생성
 */
export function createPolyline(
  points: Point[],
  options: ElementOptions = {}
): PolylineElement {
  return {
    type: 'polyline',
    id: options.id || generateId('polyline'),
    points,
    class: options.class,
    fill: options.fill || 'none',
    stroke: options.stroke || '#000000',
    strokeWidth: options.strokeWidth || 1,
    opacity: options.opacity,
    transform: options.transform,
    ariaLabel: options.ariaLabel
  };
}

/**
 * 다각형 요소 생성
 */
export function createPolygon(
  points: Point[],
  options: ElementOptions = {}
): PolygonElement {
  return {
    type: 'polygon',
    id: options.id || generateId('polygon'),
    points,
    class: options.class,
    fill: options.fill,
    stroke: options.stroke,
    strokeWidth: options.strokeWidth,
    opacity: options.opacity,
    transform: options.transform,
    ariaLabel: options.ariaLabel
  };
}

/**
 * 패스 요소 생성
 */
export function createPath(
  d: string,
  options: ElementOptions = {}
): PathElement {
  return {
    type: 'path',
    id: options.id || generateId('path'),
    d,
    class: options.class,
    fill: options.fill,
    stroke: options.stroke,
    strokeWidth: options.strokeWidth,
    opacity: options.opacity,
    transform: options.transform,
    ariaLabel: options.ariaLabel
  };
}

/**
 * 텍스트 요소 생성
 */
export function createText(
  x: number,
  y: number,
  text: string,
  options: ElementOptions & {
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: string | number;
    fontStyle?: string;
    textAnchor?: 'start' | 'middle' | 'end';
    dominantBaseline?: string;
  } = {}
): TextElement {
  return {
    type: 'text',
    id: options.id || generateId('text'),
    x,
    y,
    text,
    fontFamily: options.fontFamily,
    fontSize: options.fontSize,
    fontWeight: options.fontWeight,
    fontStyle: options.fontStyle,
    textAnchor: options.textAnchor,
    dominantBaseline: options.dominantBaseline,
    class: options.class,
    fill: options.fill || '#000000',
    stroke: options.stroke,
    strokeWidth: options.strokeWidth,
    opacity: options.opacity,
    transform: options.transform,
    ariaLabel: options.ariaLabel
  };
}

/**
 * 텍스트 패스 요소 생성
 */
export function createTextPath(
  pathId: string,
  text: string,
  options: ElementOptions & {
    startOffset?: string | number;
    fontFamily?: string;
    fontSize?: number;
  } = {}
): TextPathElement {
  return {
    type: 'textpath',
    id: options.id || generateId('textpath'),
    pathId,
    text,
    startOffset: options.startOffset,
    fontFamily: options.fontFamily,
    fontSize: options.fontSize,
    class: options.class,
    fill: options.fill || '#000000',
    stroke: options.stroke,
    strokeWidth: options.strokeWidth,
    opacity: options.opacity,
    transform: options.transform,
    ariaLabel: options.ariaLabel
  };
}

/**
 * 이미지 요소 생성
 */
export function createImage(
  href: string,
  x: number,
  y: number,
  width: number,
  height: number,
  options: ElementOptions & { preserveAspectRatio?: string } = {}
): ImageElement {
  return {
    type: 'image',
    id: options.id || generateId('image'),
    href,
    x,
    y,
    width,
    height,
    preserveAspectRatio: options.preserveAspectRatio,
    class: options.class,
    fill: options.fill,
    stroke: options.stroke,
    strokeWidth: options.strokeWidth,
    opacity: options.opacity,
    transform: options.transform,
    ariaLabel: options.ariaLabel
  };
}

/**
 * 그룹 요소 생성
 */
export function createGroup(
  children: SVGElement[] = [],
  options: ElementOptions = {}
): GroupElement {
  return {
    type: 'g',
    id: options.id || generateId('group'),
    children,
    class: options.class,
    fill: options.fill,
    stroke: options.stroke,
    strokeWidth: options.strokeWidth,
    opacity: options.opacity,
    transform: options.transform,
    ariaLabel: options.ariaLabel
  };
}

/**
 * Use(참조) 요소 생성
 */
export function createUse(
  href: string,
  options: ElementOptions & { x?: number; y?: number; width?: number; height?: number } = {}
): UseElement {
  return {
    type: 'use',
    id: options.id || generateId('use'),
    href,
    x: options.x,
    y: options.y,
    width: options.width,
    height: options.height,
    class: options.class,
    fill: options.fill,
    stroke: options.stroke,
    strokeWidth: options.strokeWidth,
    opacity: options.opacity,
    transform: options.transform,
    ariaLabel: options.ariaLabel
  };
}

/**
 * 요소 복제
 */
export function cloneElement(element: SVGElement, newId?: string): SVGElement {
  const clone = JSON.parse(JSON.stringify(element)) as SVGElement;
  clone.id = newId || generateId(element.type === 'g' ? 'group' : element.type);

  // 그룹의 경우 자식 요소도 ID 변경
  if (clone.type === 'g') {
    clone.children = clone.children.map(child => cloneElement(child));
  }

  return clone;
}

/**
 * 요소 속성 업데이트
 */
export function updateElement<T extends SVGElement>(
  element: T,
  updates: Partial<T>
): T {
  return { ...element, ...updates };
}

/**
 * 요소의 경계 상자 계산 (간단한 버전)
 */
export function getElementBounds(element: SVGElement): { x: number; y: number; width: number; height: number } | null {
  switch (element.type) {
    case 'rect':
      return { x: element.x, y: element.y, width: element.width, height: element.height };

    case 'circle':
      return {
        x: element.cx - element.r,
        y: element.cy - element.r,
        width: element.r * 2,
        height: element.r * 2
      };

    case 'ellipse':
      return {
        x: element.cx - element.rx,
        y: element.cy - element.ry,
        width: element.rx * 2,
        height: element.ry * 2
      };

    case 'line':
      return {
        x: Math.min(element.x1, element.x2),
        y: Math.min(element.y1, element.y2),
        width: Math.abs(element.x2 - element.x1),
        height: Math.abs(element.y2 - element.y1)
      };

    case 'polyline':
    case 'polygon':
      if (element.points.length === 0) return null;
      const xs = element.points.map(p => p.x);
      const ys = element.points.map(p => p.y);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      return {
        x: minX,
        y: minY,
        width: Math.max(...xs) - minX,
        height: Math.max(...ys) - minY
      };

    case 'text':
      // 텍스트 크기는 정확히 계산하기 어려움 (폰트 정보 필요)
      const fontSize = element.fontSize || 16;
      const estimatedWidth = element.text.length * fontSize * 0.6;
      return {
        x: element.x,
        y: element.y - fontSize,
        width: estimatedWidth,
        height: fontSize
      };

    case 'image':
      return { x: element.x, y: element.y, width: element.width, height: element.height };

    default:
      return null;
  }
}

/**
 * 요소 타입 확인 헬퍼
 */
export function isGroupElement(element: SVGElement): element is GroupElement {
  return element.type === 'g';
}

export function isPathElement(element: SVGElement): element is PathElement {
  return element.type === 'path';
}

export function isTextElement(element: SVGElement): element is TextElement {
  return element.type === 'text';
}
