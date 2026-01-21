/**
 * 레이어 관리자
 * SVG 요소를 레이어 단위로 그룹화하여 관리
 */

import type { Layer, LayerOperationResult, BlendMode } from '../types/layer.js';
import { generateId } from './id-generator.js';

/**
 * 레이어 관리자 클래스
 */
export class LayerManager {
  private layers: Layer[] = [];
  private activeLayerId: string | null = null;

  constructor() {
    // 기본 레이어 생성
    this.createLayer('Layer 1');
  }

  /**
   * 새 레이어 생성
   */
  createLayer(name?: string, insertAt?: number): LayerOperationResult {
    const layer: Layer = {
      id: generateId('layer'),
      name: name || `Layer ${this.layers.length + 1}`,
      visible: true,
      locked: false,
      opacity: 1,
      elements: []
    };

    if (insertAt !== undefined && insertAt >= 0 && insertAt <= this.layers.length) {
      this.layers.splice(insertAt, 0, layer);
    } else {
      this.layers.push(layer);
    }

    // 첫 레이어면 활성화
    if (this.layers.length === 1) {
      this.activeLayerId = layer.id;
    }

    return { success: true, layerId: layer.id, message: `레이어 '${layer.name}' 생성됨` };
  }

  /**
   * 레이어 삭제
   */
  deleteLayer(layerId: string): LayerOperationResult {
    const index = this.layers.findIndex(l => l.id === layerId);
    if (index === -1) {
      return { success: false, message: '레이어를 찾을 수 없습니다.' };
    }

    // 마지막 레이어는 삭제 불가
    if (this.layers.length === 1) {
      return { success: false, message: '마지막 레이어는 삭제할 수 없습니다.' };
    }

    const layer = this.layers[index];
    this.layers.splice(index, 1);

    // 활성 레이어였다면 다른 레이어 활성화
    if (this.activeLayerId === layerId) {
      this.activeLayerId = this.layers[Math.min(index, this.layers.length - 1)]?.id || null;
    }

    return { success: true, message: `레이어 '${layer.name}' 삭제됨` };
  }

  /**
   * 레이어 이름 변경
   */
  renameLayer(layerId: string, newName: string): LayerOperationResult {
    const layer = this.getLayer(layerId);
    if (!layer) {
      return { success: false, message: '레이어를 찾을 수 없습니다.' };
    }

    const oldName = layer.name;
    layer.name = newName;

    return { success: true, layerId, message: `레이어 이름 변경: '${oldName}' → '${newName}'` };
  }

  /**
   * 레이어 순서 변경
   */
  reorderLayer(layerId: string, newIndex: number): LayerOperationResult {
    const currentIndex = this.layers.findIndex(l => l.id === layerId);
    if (currentIndex === -1) {
      return { success: false, message: '레이어를 찾을 수 없습니다.' };
    }

    if (newIndex < 0 || newIndex >= this.layers.length) {
      return { success: false, message: '유효하지 않은 인덱스입니다.' };
    }

    const [layer] = this.layers.splice(currentIndex, 1);
    this.layers.splice(newIndex, 0, layer);

    return { success: true, layerId, message: `레이어 '${layer.name}' 순서 변경됨` };
  }

  /**
   * 레이어 표시/숨김 토글
   */
  setLayerVisibility(layerId: string, visible: boolean): LayerOperationResult {
    const layer = this.getLayer(layerId);
    if (!layer) {
      return { success: false, message: '레이어를 찾을 수 없습니다.' };
    }

    layer.visible = visible;

    return {
      success: true,
      layerId,
      message: `레이어 '${layer.name}' ${visible ? '표시' : '숨김'}`
    };
  }

  /**
   * 레이어 잠금 토글
   */
  setLayerLock(layerId: string, locked: boolean): LayerOperationResult {
    const layer = this.getLayer(layerId);
    if (!layer) {
      return { success: false, message: '레이어를 찾을 수 없습니다.' };
    }

    layer.locked = locked;

    return {
      success: true,
      layerId,
      message: `레이어 '${layer.name}' ${locked ? '잠금' : '잠금 해제'}`
    };
  }

  /**
   * 레이어 불투명도 설정
   */
  setLayerOpacity(layerId: string, opacity: number): LayerOperationResult {
    const layer = this.getLayer(layerId);
    if (!layer) {
      return { success: false, message: '레이어를 찾을 수 없습니다.' };
    }

    if (opacity < 0 || opacity > 1) {
      return { success: false, message: '불투명도는 0~1 사이여야 합니다.' };
    }

    layer.opacity = opacity;

    return {
      success: true,
      layerId,
      message: `레이어 '${layer.name}' 불투명도: ${Math.round(opacity * 100)}%`
    };
  }

  /**
   * 레이어 블렌드 모드 설정
   */
  setLayerBlendMode(layerId: string, blendMode: BlendMode): LayerOperationResult {
    const layer = this.getLayer(layerId);
    if (!layer) {
      return { success: false, message: '레이어를 찾을 수 없습니다.' };
    }

    layer.blendMode = blendMode;

    return {
      success: true,
      layerId,
      message: `레이어 '${layer.name}' 블렌드 모드: ${blendMode}`
    };
  }

  /**
   * 레이어 조회
   */
  getLayer(layerId: string): Layer | null {
    return this.layers.find(l => l.id === layerId) || null;
  }

  /**
   * 레이어 목록 조회
   */
  getLayers(): Layer[] {
    return [...this.layers];
  }

  /**
   * 레이어 개수
   */
  getLayerCount(): number {
    return this.layers.length;
  }

  /**
   * 활성 레이어 조회
   */
  getActiveLayer(): Layer | null {
    if (!this.activeLayerId) return null;
    return this.getLayer(this.activeLayerId);
  }

  /**
   * 활성 레이어 설정
   */
  setActiveLayer(layerId: string): LayerOperationResult {
    const layer = this.getLayer(layerId);
    if (!layer) {
      return { success: false, message: '레이어를 찾을 수 없습니다.' };
    }

    this.activeLayerId = layerId;

    return { success: true, layerId, message: `활성 레이어: '${layer.name}'` };
  }

  /**
   * 요소를 레이어에 추가
   */
  addElementToLayer(layerId: string, elementId: string): LayerOperationResult {
    const layer = this.getLayer(layerId);
    if (!layer) {
      return { success: false, message: '레이어를 찾을 수 없습니다.' };
    }

    if (layer.locked) {
      return { success: false, message: '잠긴 레이어에는 요소를 추가할 수 없습니다.' };
    }

    // 다른 레이어에서 제거
    for (const l of this.layers) {
      const index = l.elements.indexOf(elementId);
      if (index !== -1) {
        l.elements.splice(index, 1);
      }
    }

    layer.elements.push(elementId);

    return { success: true, layerId, message: `요소가 레이어 '${layer.name}'에 추가됨` };
  }

  /**
   * 요소를 활성 레이어에 추가
   */
  addElementToActiveLayer(elementId: string): LayerOperationResult {
    const activeLayer = this.getActiveLayer();
    if (!activeLayer) {
      // 레이어가 없으면 생성
      const result = this.createLayer();
      if (!result.success || !result.layerId) {
        return result;
      }
      return this.addElementToLayer(result.layerId, elementId);
    }

    return this.addElementToLayer(activeLayer.id, elementId);
  }

  /**
   * 요소가 속한 레이어 찾기
   */
  findLayerByElement(elementId: string): Layer | null {
    for (const layer of this.layers) {
      if (layer.elements.includes(elementId)) {
        return layer;
      }
    }
    return null;
  }

  /**
   * 요소를 레이어에서 제거
   */
  removeElementFromLayer(elementId: string): LayerOperationResult {
    for (const layer of this.layers) {
      const index = layer.elements.indexOf(elementId);
      if (index !== -1) {
        layer.elements.splice(index, 1);
        return { success: true, message: `요소가 레이어 '${layer.name}'에서 제거됨` };
      }
    }
    return { success: false, message: '요소를 찾을 수 없습니다.' };
  }

  /**
   * 레이어 병합
   */
  mergeLayers(sourceLayerId: string, targetLayerId: string): LayerOperationResult {
    const sourceLayer = this.getLayer(sourceLayerId);
    const targetLayer = this.getLayer(targetLayerId);

    if (!sourceLayer || !targetLayer) {
      return { success: false, message: '레이어를 찾을 수 없습니다.' };
    }

    if (sourceLayerId === targetLayerId) {
      return { success: false, message: '같은 레이어끼리 병합할 수 없습니다.' };
    }

    // 요소 이동
    targetLayer.elements.push(...sourceLayer.elements);

    // 소스 레이어 삭제
    return this.deleteLayer(sourceLayerId);
  }

  /**
   * 레이어 복제
   */
  duplicateLayer(layerId: string): LayerOperationResult {
    const layer = this.getLayer(layerId);
    if (!layer) {
      return { success: false, message: '레이어를 찾을 수 없습니다.' };
    }

    const newLayer: Layer = {
      id: generateId('layer'),
      name: `${layer.name} (복사본)`,
      visible: layer.visible,
      locked: false,
      opacity: layer.opacity,
      blendMode: layer.blendMode,
      elements: [...layer.elements] // 요소 ID는 복사 (실제 요소 복제는 별도)
    };

    const index = this.layers.findIndex(l => l.id === layerId);
    this.layers.splice(index + 1, 0, newLayer);

    return { success: true, layerId: newLayer.id, message: `레이어 '${newLayer.name}' 복제됨` };
  }

  /**
   * 모든 레이어 초기화
   */
  reset(): void {
    this.layers = [];
    this.activeLayerId = null;
    this.createLayer('Layer 1');
  }

  /**
   * 상태 직렬화
   */
  toJSON(): { layers: Layer[]; activeLayerId: string | null } {
    return {
      layers: JSON.parse(JSON.stringify(this.layers)),
      activeLayerId: this.activeLayerId
    };
  }

  /**
   * 상태 복원
   */
  fromJSON(data: { layers: Layer[]; activeLayerId: string | null }): void {
    this.layers = JSON.parse(JSON.stringify(data.layers));
    this.activeLayerId = data.activeLayerId;

    // 레이어가 없으면 기본 레이어 생성
    if (this.layers.length === 0) {
      this.createLayer('Layer 1');
    }
  }
}

// 싱글톤 인스턴스
let currentLayerManager: LayerManager | null = null;

/**
 * 현재 레이어 매니저 가져오기
 */
export function getLayerManager(): LayerManager {
  if (!currentLayerManager) {
    currentLayerManager = new LayerManager();
  }
  return currentLayerManager;
}

/**
 * 레이어 매니저 초기화
 */
export function resetLayerManager(): void {
  currentLayerManager = null;
}
