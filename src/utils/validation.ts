/**
 * 입력 검증 유틸리티
 */

import { isValidColor } from './color-utils.js';
import { isValidId } from '../core/id-generator.js';

// 검증 결과 타입
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * 숫자 범위 검증
 */
export function validateNumber(
  value: unknown,
  name: string,
  options: {
    min?: number;
    max?: number;
    allowNaN?: boolean;
    allowInfinity?: boolean;
    integer?: boolean;
  } = {}
): ValidationResult {
  const errors: string[] = [];

  if (typeof value !== 'number') {
    return { valid: false, errors: [`${name}은(는) 숫자여야 합니다.`] };
  }

  if (!options.allowNaN && isNaN(value)) {
    errors.push(`${name}은(는) NaN일 수 없습니다.`);
  }

  if (!options.allowInfinity && !isFinite(value)) {
    errors.push(`${name}은(는) 유한한 값이어야 합니다.`);
  }

  if (options.min !== undefined && value < options.min) {
    errors.push(`${name}은(는) ${options.min} 이상이어야 합니다. (현재: ${value})`);
  }

  if (options.max !== undefined && value > options.max) {
    errors.push(`${name}은(는) ${options.max} 이하여야 합니다. (현재: ${value})`);
  }

  if (options.integer && !Number.isInteger(value)) {
    errors.push(`${name}은(는) 정수여야 합니다.`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * 문자열 검증
 */
export function validateString(
  value: unknown,
  name: string,
  options: {
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    allowEmpty?: boolean;
  } = {}
): ValidationResult {
  const errors: string[] = [];

  if (typeof value !== 'string') {
    return { valid: false, errors: [`${name}은(는) 문자열이어야 합니다.`] };
  }

  if (!options.allowEmpty && value.length === 0) {
    errors.push(`${name}은(는) 비어있을 수 없습니다.`);
  }

  if (options.minLength !== undefined && value.length < options.minLength) {
    errors.push(`${name}은(는) 최소 ${options.minLength}자 이상이어야 합니다.`);
  }

  if (options.maxLength !== undefined && value.length > options.maxLength) {
    errors.push(`${name}은(는) 최대 ${options.maxLength}자 이하여야 합니다.`);
  }

  if (options.pattern && !options.pattern.test(value)) {
    errors.push(`${name}의 형식이 올바르지 않습니다.`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * 색상 검증
 */
export function validateColor(value: unknown, name: string): ValidationResult {
  if (typeof value !== 'string') {
    return { valid: false, errors: [`${name}은(는) 문자열이어야 합니다.`] };
  }

  if (!isValidColor(value)) {
    return {
      valid: false,
      errors: [`${name}은(는) 유효한 색상 값이어야 합니다. (hex, rgb, rgba, hsl, 색상명, url())`]
    };
  }

  return { valid: true, errors: [] };
}

/**
 * ID 검증
 */
export function validateId(value: unknown, name: string): ValidationResult {
  if (typeof value !== 'string') {
    return { valid: false, errors: [`${name}은(는) 문자열이어야 합니다.`] };
  }

  if (!isValidId(value)) {
    return {
      valid: false,
      errors: [`${name}은(는) 유효한 ID여야 합니다. (문자로 시작, 영숫자/하이픈/언더스코어 허용)`]
    };
  }

  return { valid: true, errors: [] };
}

/**
 * 점 좌표 검증
 */
export function validatePoint(value: unknown, name: string): ValidationResult {
  if (typeof value !== 'object' || value === null) {
    return { valid: false, errors: [`${name}은(는) 객체여야 합니다.`] };
  }

  const point = value as Record<string, unknown>;
  const errors: string[] = [];

  const xResult = validateNumber(point.x, `${name}.x`);
  const yResult = validateNumber(point.y, `${name}.y`);

  errors.push(...xResult.errors, ...yResult.errors);

  return { valid: errors.length === 0, errors };
}

/**
 * 점 배열 검증
 */
export function validatePoints(value: unknown, name: string, minPoints: number = 0): ValidationResult {
  if (!Array.isArray(value)) {
    return { valid: false, errors: [`${name}은(는) 배열이어야 합니다.`] };
  }

  const errors: string[] = [];

  if (value.length < minPoints) {
    errors.push(`${name}에는 최소 ${minPoints}개의 점이 필요합니다.`);
  }

  for (let i = 0; i < value.length; i++) {
    const result = validatePoint(value[i], `${name}[${i}]`);
    errors.push(...result.errors);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * 캔버스 크기 검증
 */
export function validateCanvasSize(width: unknown, height: unknown): ValidationResult {
  const errors: string[] = [];

  const widthResult = validateNumber(width, 'width', { min: 1, max: 10000 });
  const heightResult = validateNumber(height, 'height', { min: 1, max: 10000 });

  errors.push(...widthResult.errors, ...heightResult.errors);

  return { valid: errors.length === 0, errors };
}

/**
 * 사각형 매개변수 검증
 */
export function validateRect(
  x: unknown,
  y: unknown,
  width: unknown,
  height: unknown
): ValidationResult {
  const errors: string[] = [];

  errors.push(...validateNumber(x, 'x').errors);
  errors.push(...validateNumber(y, 'y').errors);
  errors.push(...validateNumber(width, 'width', { min: 0 }).errors);
  errors.push(...validateNumber(height, 'height', { min: 0 }).errors);

  return { valid: errors.length === 0, errors };
}

/**
 * 원/타원 매개변수 검증
 */
export function validateCircle(cx: unknown, cy: unknown, r: unknown): ValidationResult {
  const errors: string[] = [];

  errors.push(...validateNumber(cx, 'cx').errors);
  errors.push(...validateNumber(cy, 'cy').errors);
  errors.push(...validateNumber(r, 'r', { min: 0 }).errors);

  return { valid: errors.length === 0, errors };
}

/**
 * 선 매개변수 검증
 */
export function validateLine(
  x1: unknown,
  y1: unknown,
  x2: unknown,
  y2: unknown
): ValidationResult {
  const errors: string[] = [];

  errors.push(...validateNumber(x1, 'x1').errors);
  errors.push(...validateNumber(y1, 'y1').errors);
  errors.push(...validateNumber(x2, 'x2').errors);
  errors.push(...validateNumber(y2, 'y2').errors);

  return { valid: errors.length === 0, errors };
}

/**
 * 불투명도 검증
 */
export function validateOpacity(value: unknown, name: string = 'opacity'): ValidationResult {
  return validateNumber(value, name, { min: 0, max: 1 });
}

/**
 * 선 두께 검증
 */
export function validateStrokeWidth(value: unknown): ValidationResult {
  return validateNumber(value, 'strokeWidth', { min: 0 });
}

/**
 * 파일 경로 검증
 */
export function validateFilePath(value: unknown, name: string = 'filePath'): ValidationResult {
  if (typeof value !== 'string') {
    return { valid: false, errors: [`${name}은(는) 문자열이어야 합니다.`] };
  }

  if (value.length === 0) {
    return { valid: false, errors: [`${name}은(는) 비어있을 수 없습니다.`] };
  }

  // 기본적인 경로 검증 (위험한 패턴 차단)
  if (value.includes('\0')) {
    return { valid: false, errors: ['파일 경로에 null 바이트를 포함할 수 없습니다.'] };
  }

  return { valid: true, errors: [] };
}

/**
 * 여러 검증 결과 병합
 */
export function mergeValidationResults(...results: ValidationResult[]): ValidationResult {
  const allErrors = results.flatMap(r => r.errors);
  return {
    valid: allErrors.length === 0,
    errors: allErrors
  };
}

/**
 * 필수 필드 검증
 */
export function validateRequired(value: unknown, name: string): ValidationResult {
  if (value === undefined || value === null) {
    return { valid: false, errors: [`${name}은(는) 필수입니다.`] };
  }
  return { valid: true, errors: [] };
}

/**
 * 열거형 값 검증
 */
export function validateEnum<T extends string>(
  value: unknown,
  name: string,
  allowedValues: readonly T[]
): ValidationResult {
  if (typeof value !== 'string') {
    return { valid: false, errors: [`${name}은(는) 문자열이어야 합니다.`] };
  }

  if (!allowedValues.includes(value as T)) {
    return {
      valid: false,
      errors: [`${name}은(는) 다음 중 하나여야 합니다: ${allowedValues.join(', ')}`]
    };
  }

  return { valid: true, errors: [] };
}
