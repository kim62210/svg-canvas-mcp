/**
 * SVG 관련 타입 정의
 */

// 기본 좌표/크기 타입
export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Rect extends Point, Size {}

// 색상 타입
export type Color = string; // hex, rgb, rgba, hsl, named colors

// ViewBox 타입
export interface ViewBox {
  minX: number;
  minY: number;
  width: number;
  height: number;
}

// Transform 타입
export interface Transform {
  translate?: { x: number; y: number };
  scale?: { x: number; y: number };
  rotate?: { angle: number; cx?: number; cy?: number };
  skewX?: number;
  skewY?: number;
  matrix?: [number, number, number, number, number, number];
}

// Stroke 설정
export interface StrokeStyle {
  color?: Color;
  width?: number;
  opacity?: number;
  linecap?: 'butt' | 'round' | 'square';
  linejoin?: 'miter' | 'round' | 'bevel';
  dasharray?: number[];
  dashoffset?: number;
  miterlimit?: number;
}

// Fill 설정
export interface FillStyle {
  color?: Color;
  opacity?: number;
  rule?: 'nonzero' | 'evenodd';
}

// Gradient Stop
export interface GradientStop {
  offset: number; // 0-1
  color: Color;
  opacity?: number;
}

// Linear Gradient
export interface LinearGradient {
  id: string;
  type: 'linear';
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  stops: GradientStop[];
  gradientUnits?: 'userSpaceOnUse' | 'objectBoundingBox';
  spreadMethod?: 'pad' | 'reflect' | 'repeat';
}

// Radial Gradient
export interface RadialGradient {
  id: string;
  type: 'radial';
  cx?: number;
  cy?: number;
  r?: number;
  fx?: number;
  fy?: number;
  stops: GradientStop[];
  gradientUnits?: 'userSpaceOnUse' | 'objectBoundingBox';
  spreadMethod?: 'pad' | 'reflect' | 'repeat';
}

export type Gradient = LinearGradient | RadialGradient;

// Pattern
export interface Pattern {
  id: string;
  width: number;
  height: number;
  patternUnits?: 'userSpaceOnUse' | 'objectBoundingBox';
  patternContentUnits?: 'userSpaceOnUse' | 'objectBoundingBox';
  content: string; // SVG content
}

// Filter 타입
export type FilterType =
  | 'blur'
  | 'brightness'
  | 'contrast'
  | 'drop-shadow'
  | 'grayscale'
  | 'hue-rotate'
  | 'invert'
  | 'opacity'
  | 'saturate'
  | 'sepia';

export interface Filter {
  id: string;
  type: FilterType;
  params: Record<string, number | string>;
}

// SVG 요소 공통 속성
export interface SVGElementAttributes {
  id: string;
  class?: string;
  style?: string;
  fill?: Color | string; // color or url(#id)
  stroke?: Color | string;
  strokeWidth?: number;
  opacity?: number;
  transform?: string;
  clipPath?: string;
  mask?: string;
  filter?: string;
  // 접근성
  ariaLabel?: string;
  ariaHidden?: boolean;
  role?: string;
}

// 기본 도형 타입들
export interface RectElement extends SVGElementAttributes {
  type: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
  rx?: number;
  ry?: number;
}

export interface CircleElement extends SVGElementAttributes {
  type: 'circle';
  cx: number;
  cy: number;
  r: number;
}

export interface EllipseElement extends SVGElementAttributes {
  type: 'ellipse';
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

export interface LineElement extends SVGElementAttributes {
  type: 'line';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface PolylineElement extends SVGElementAttributes {
  type: 'polyline';
  points: Point[];
}

export interface PolygonElement extends SVGElementAttributes {
  type: 'polygon';
  points: Point[];
}

export interface PathElement extends SVGElementAttributes {
  type: 'path';
  d: string;
}

export interface TextElement extends SVGElementAttributes {
  type: 'text';
  x: number;
  y: number;
  text: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string | number;
  fontStyle?: string;
  textAnchor?: 'start' | 'middle' | 'end';
  dominantBaseline?: string;
  letterSpacing?: number;
  wordSpacing?: number;
  textDecoration?: string;
}

export interface TextPathElement extends SVGElementAttributes {
  type: 'textpath';
  pathId: string;
  text: string;
  startOffset?: string | number;
  fontFamily?: string;
  fontSize?: number;
}

export interface ImageElement extends SVGElementAttributes {
  type: 'image';
  href: string;
  x: number;
  y: number;
  width: number;
  height: number;
  preserveAspectRatio?: string;
}

export interface GroupElement extends SVGElementAttributes {
  type: 'g';
  children: SVGElement[];
}

export interface UseElement extends SVGElementAttributes {
  type: 'use';
  href: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

// 모든 SVG 요소 유니온 타입
export type SVGElement =
  | RectElement
  | CircleElement
  | EllipseElement
  | LineElement
  | PolylineElement
  | PolygonElement
  | PathElement
  | TextElement
  | TextPathElement
  | ImageElement
  | GroupElement
  | UseElement;

// Symbol 정의
export interface Symbol {
  id: string;
  viewBox?: string;
  content: SVGElement[];
}

// 캔버스 설정
export interface CanvasConfig {
  width: number;
  height: number;
  viewBox?: ViewBox;
  background?: Color;
  preserveAspectRatio?: string;
}

// SVG 문서 전체 구조
export interface SVGDocument {
  config: CanvasConfig;
  defs: {
    gradients: Gradient[];
    patterns: Pattern[];
    filters: Filter[];
    symbols: Symbol[];
    clipPaths: PathElement[];
    masks: GroupElement[];
  };
  elements: SVGElement[];
}
