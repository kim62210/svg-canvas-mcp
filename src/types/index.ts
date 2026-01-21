/**
 * 타입 정의 모듈 내보내기
 */

export * from './svg.js';
export * from './layer.js';
export * from './animation.js';

// 히스토리 타입
export interface HistoryEntry {
  id: string;
  action: string;
  timestamp: Date;
  data: unknown;
  description: string;
}

export interface HistoryState {
  entries: HistoryEntry[];
  currentIndex: number;
  maxEntries: number;
}

// 템플릿 타입
export interface Template {
  id: string;
  name: string;
  description: string;
  tags: string[];
  category: string;
  thumbnail?: string;
  content: string; // SVG content
  metadata: {
    width: number;
    height: number;
    createdAt: Date;
    updatedAt: Date;
  };
}

// 메타데이터 파일 형식
export interface SVGMetadata {
  version: string;
  canvas: {
    width: number;
    height: number;
    viewBox: string;
    background?: string;
  };
  layers: import('./layer.js').Layer[];
  symbols: Record<string, {
    viewBox: string;
    content: string;
  }>;
  history: {
    current: number;
    entries: Array<{
      action: string;
      timestamp: string;
      description: string;
    }>;
  };
}

// Tool 응답 타입
export interface ToolResponse {
  success: boolean;
  message?: string;
  data?: unknown;
}

// 좌표 변환 결과
export interface TransformResult {
  x: number;
  y: number;
  width?: number;
  height?: number;
  transform?: string;
}
