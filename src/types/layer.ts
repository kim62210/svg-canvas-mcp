/**
 * 레이어 관련 타입 정의
 */

// 레이어 상태
export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode?: BlendMode;
  elements: string[]; // 요소 ID 목록
  parentId?: string; // 중첩 레이어용
}

// 블렌드 모드
export type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion'
  | 'hue'
  | 'saturation'
  | 'color'
  | 'luminosity';

// 레이어 트리 노드
export interface LayerNode {
  layer: Layer;
  children: LayerNode[];
}

// 레이어 조작 결과
export interface LayerOperationResult {
  success: boolean;
  layerId?: string;
  message?: string;
}

// 레이어 메타데이터 (저장용)
export interface LayerMetadata {
  layers: Layer[];
  activeLayerId?: string;
}
