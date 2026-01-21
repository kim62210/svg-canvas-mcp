/**
 * 고유 ID 생성기
 * SVG 요소, 레이어, 애니메이션 등에 사용되는 고유 ID 생성
 */

import { v4 as uuidv4 } from 'uuid';

// ID 프리픽스 타입
type IdPrefix =
  | 'rect'
  | 'circle'
  | 'ellipse'
  | 'line'
  | 'polyline'
  | 'polygon'
  | 'path'
  | 'text'
  | 'textpath'
  | 'image'
  | 'group'
  | 'use'
  | 'layer'
  | 'gradient'
  | 'pattern'
  | 'filter'
  | 'symbol'
  | 'clip'
  | 'mask'
  | 'anim'
  | 'history';

// 카운터 기반 ID 생성 (짧은 ID용)
const counters: Record<string, number> = {};

/**
 * 짧은 순차 ID 생성
 * @param prefix - ID 프리픽스 (요소 타입)
 * @returns 고유 ID (예: rect-1, circle-2)
 */
export function generateId(prefix: IdPrefix): string {
  if (!counters[prefix]) {
    counters[prefix] = 0;
  }
  counters[prefix]++;
  return `${prefix}-${counters[prefix]}`;
}

/**
 * UUID 기반 긴 ID 생성 (충돌 방지가 중요한 경우)
 * @param prefix - ID 프리픽스 (선택)
 * @returns UUID 기반 ID
 */
export function generateUUID(prefix?: string): string {
  const uuid = uuidv4();
  return prefix ? `${prefix}-${uuid}` : uuid;
}

/**
 * 카운터 초기화 (새 문서 생성 시)
 */
export function resetCounters(): void {
  for (const key of Object.keys(counters)) {
    delete counters[key];
  }
}

/**
 * 특정 프리픽스의 카운터 값 설정 (기존 문서 로드 시)
 * @param prefix - ID 프리픽스
 * @param value - 카운터 값
 */
export function setCounter(prefix: string, value: number): void {
  counters[prefix] = value;
}

/**
 * 기존 ID에서 카운터 값 추출 및 업데이트
 * @param id - 기존 ID (예: rect-5)
 */
export function syncCounterFromId(id: string): void {
  const match = id.match(/^([a-z]+)-(\d+)$/);
  if (match) {
    const [, prefix, numStr] = match;
    const num = parseInt(numStr, 10);
    if (!counters[prefix] || counters[prefix] < num) {
      counters[prefix] = num;
    }
  }
}

/**
 * 여러 ID에서 카운터 동기화
 * @param ids - ID 목록
 */
export function syncCountersFromIds(ids: string[]): void {
  for (const id of ids) {
    syncCounterFromId(id);
  }
}

/**
 * ID 유효성 검사
 * @param id - 검사할 ID
 * @returns 유효 여부
 */
export function isValidId(id: string): boolean {
  // SVG ID 규칙: 문자로 시작, 문자/숫자/하이픈/언더스코어 허용
  return /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(id);
}

/**
 * ID를 SVG 안전한 형식으로 변환
 * @param id - 변환할 ID
 * @returns 안전한 ID
 */
export function sanitizeId(id: string): string {
  // 첫 글자가 숫자면 앞에 언더스코어 추가
  let sanitized = id.replace(/[^a-zA-Z0-9_-]/g, '-');
  if (/^[0-9]/.test(sanitized)) {
    sanitized = '_' + sanitized;
  }
  return sanitized;
}
