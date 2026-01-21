/**
 * 애니메이션 관련 타입 정의
 */

// CSS 애니메이션 타이밍 함수
export type TimingFunction =
  | 'linear'
  | 'ease'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | `cubic-bezier(${number}, ${number}, ${number}, ${number})`;

// CSS 키프레임
export interface CSSKeyframe {
  offset: number; // 0-100
  properties: Record<string, string | number>;
}

// CSS 애니메이션 정의
export interface CSSAnimation {
  id: string;
  name: string;
  keyframes: CSSKeyframe[];
  duration: string; // e.g., '1s', '500ms'
  timingFunction?: TimingFunction;
  delay?: string;
  iterationCount?: number | 'infinite';
  direction?: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
  fillMode?: 'none' | 'forwards' | 'backwards' | 'both';
  playState?: 'running' | 'paused';
}

// SMIL 애니메이션 속성 타입
export type SMILAnimationType =
  | 'animate'
  | 'animateTransform'
  | 'animateMotion'
  | 'set';

// SMIL Transform 타입
export type SMILTransformType =
  | 'translate'
  | 'scale'
  | 'rotate'
  | 'skewX'
  | 'skewY';

// SMIL 애니메이션 정의
export interface SMILAnimation {
  id: string;
  type: SMILAnimationType;
  attributeName: string;
  from?: string;
  to?: string;
  values?: string[]; // for complex animations
  dur: string; // duration
  begin?: string;
  end?: string;
  repeatCount?: number | 'indefinite';
  repeatDur?: string;
  fill?: 'freeze' | 'remove';
  calcMode?: 'discrete' | 'linear' | 'paced' | 'spline';
  keyTimes?: number[];
  keySplines?: string[];
  // For animateTransform
  transformType?: SMILTransformType;
  // For animateMotion
  path?: string;
  rotate?: 'auto' | 'auto-reverse' | number;
}

// 요소에 적용된 애니메이션 정보
export interface ElementAnimation {
  elementId: string;
  cssAnimations: CSSAnimation[];
  smilAnimations: SMILAnimation[];
}

// 애니메이션 타임라인
export interface AnimationTimeline {
  animations: ElementAnimation[];
  totalDuration: number;
  isPlaying: boolean;
  currentTime: number;
}
