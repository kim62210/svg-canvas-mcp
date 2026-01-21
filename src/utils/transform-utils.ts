/**
 * SVG 변환(Transform) 유틸리티
 */

import type { Point, Transform } from '../types/index.js';

// 2D 변환 행렬 (3x3 but stored as 6 values for affine transform)
// [ a c e ]
// [ b d f ]
// [ 0 0 1 ]
export type Matrix = [number, number, number, number, number, number];

// 단위 행렬
export const IDENTITY_MATRIX: Matrix = [1, 0, 0, 1, 0, 0];

/**
 * Transform 객체를 SVG transform 문자열로 변환
 */
export function transformToString(transform: Transform): string {
  const parts: string[] = [];

  if (transform.translate) {
    parts.push(`translate(${transform.translate.x}, ${transform.translate.y})`);
  }

  if (transform.rotate) {
    if (transform.rotate.cx !== undefined && transform.rotate.cy !== undefined) {
      parts.push(`rotate(${transform.rotate.angle}, ${transform.rotate.cx}, ${transform.rotate.cy})`);
    } else {
      parts.push(`rotate(${transform.rotate.angle})`);
    }
  }

  if (transform.scale) {
    if (transform.scale.x === transform.scale.y) {
      parts.push(`scale(${transform.scale.x})`);
    } else {
      parts.push(`scale(${transform.scale.x}, ${transform.scale.y})`);
    }
  }

  if (transform.skewX !== undefined) {
    parts.push(`skewX(${transform.skewX})`);
  }

  if (transform.skewY !== undefined) {
    parts.push(`skewY(${transform.skewY})`);
  }

  if (transform.matrix) {
    parts.push(`matrix(${transform.matrix.join(', ')})`);
  }

  return parts.join(' ');
}

/**
 * SVG transform 문자열 파싱
 */
export function parseTransform(transformStr: string): Transform {
  const transform: Transform = {};
  const regex = /(translate|rotate|scale|skewX|skewY|matrix)\(([^)]+)\)/gi;
  let match;

  while ((match = regex.exec(transformStr)) !== null) {
    const type = match[1].toLowerCase();
    const values = match[2].split(/[\s,]+/).map(Number);

    switch (type) {
      case 'translate':
        transform.translate = { x: values[0], y: values[1] || 0 };
        break;
      case 'rotate':
        transform.rotate = {
          angle: values[0],
          cx: values[1],
          cy: values[2]
        };
        break;
      case 'scale':
        transform.scale = {
          x: values[0],
          y: values[1] !== undefined ? values[1] : values[0]
        };
        break;
      case 'skewx':
        transform.skewX = values[0];
        break;
      case 'skewy':
        transform.skewY = values[0];
        break;
      case 'matrix':
        transform.matrix = values.slice(0, 6) as Matrix;
        break;
    }
  }

  return transform;
}

/**
 * 이동 행렬 생성
 */
export function translateMatrix(tx: number, ty: number): Matrix {
  return [1, 0, 0, 1, tx, ty];
}

/**
 * 회전 행렬 생성 (라디안)
 */
export function rotateMatrix(angle: number, cx: number = 0, cy: number = 0): Matrix {
  const rad = angle * Math.PI / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  if (cx === 0 && cy === 0) {
    return [cos, sin, -sin, cos, 0, 0];
  }

  // 중심점 기준 회전: translate(-cx, -cy) * rotate * translate(cx, cy)
  return [
    cos, sin,
    -sin, cos,
    cx - cx * cos + cy * sin,
    cy - cx * sin - cy * cos
  ];
}

/**
 * 크기 조절 행렬 생성
 */
export function scaleMatrix(sx: number, sy: number = sx, cx: number = 0, cy: number = 0): Matrix {
  if (cx === 0 && cy === 0) {
    return [sx, 0, 0, sy, 0, 0];
  }

  // 중심점 기준 스케일
  return [sx, 0, 0, sy, cx - sx * cx, cy - sy * cy];
}

/**
 * X축 기울임 행렬 생성
 */
export function skewXMatrix(angle: number): Matrix {
  const tan = Math.tan(angle * Math.PI / 180);
  return [1, 0, tan, 1, 0, 0];
}

/**
 * Y축 기울임 행렬 생성
 */
export function skewYMatrix(angle: number): Matrix {
  const tan = Math.tan(angle * Math.PI / 180);
  return [1, tan, 0, 1, 0, 0];
}

/**
 * 두 행렬 곱셈
 */
export function multiplyMatrix(a: Matrix, b: Matrix): Matrix {
  return [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5]
  ];
}

/**
 * 행렬의 역행렬 계산
 */
export function invertMatrix(m: Matrix): Matrix | null {
  const det = m[0] * m[3] - m[1] * m[2];

  if (Math.abs(det) < 1e-10) {
    return null; // 역행렬 없음
  }

  const invDet = 1 / det;

  return [
    m[3] * invDet,
    -m[1] * invDet,
    -m[2] * invDet,
    m[0] * invDet,
    (m[2] * m[5] - m[3] * m[4]) * invDet,
    (m[1] * m[4] - m[0] * m[5]) * invDet
  ];
}

/**
 * 점에 행렬 적용
 */
export function applyMatrix(point: Point, matrix: Matrix): Point {
  return {
    x: matrix[0] * point.x + matrix[2] * point.y + matrix[4],
    y: matrix[1] * point.x + matrix[3] * point.y + matrix[5]
  };
}

/**
 * Transform 객체를 행렬로 변환
 */
export function transformToMatrix(transform: Transform): Matrix {
  let matrix: Matrix = [...IDENTITY_MATRIX];

  if (transform.translate) {
    matrix = multiplyMatrix(matrix, translateMatrix(transform.translate.x, transform.translate.y));
  }

  if (transform.rotate) {
    matrix = multiplyMatrix(matrix, rotateMatrix(
      transform.rotate.angle,
      transform.rotate.cx || 0,
      transform.rotate.cy || 0
    ));
  }

  if (transform.scale) {
    matrix = multiplyMatrix(matrix, scaleMatrix(transform.scale.x, transform.scale.y));
  }

  if (transform.skewX !== undefined) {
    matrix = multiplyMatrix(matrix, skewXMatrix(transform.skewX));
  }

  if (transform.skewY !== undefined) {
    matrix = multiplyMatrix(matrix, skewYMatrix(transform.skewY));
  }

  if (transform.matrix) {
    matrix = multiplyMatrix(matrix, transform.matrix);
  }

  return matrix;
}

/**
 * 행렬을 SVG matrix() 문자열로 변환
 */
export function matrixToString(matrix: Matrix): string {
  return `matrix(${matrix.join(', ')})`;
}

/**
 * 경계 상자 (bounding box) 타입
 */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 점들의 경계 상자 계산
 */
export function getBoundingBox(points: Point[]): BoundingBox | null {
  if (points.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}

/**
 * 경계 상자에 행렬 적용 (변환된 경계 상자 계산)
 */
export function transformBoundingBox(bbox: BoundingBox, matrix: Matrix): BoundingBox {
  const corners: Point[] = [
    { x: bbox.x, y: bbox.y },
    { x: bbox.x + bbox.width, y: bbox.y },
    { x: bbox.x + bbox.width, y: bbox.y + bbox.height },
    { x: bbox.x, y: bbox.y + bbox.height }
  ];

  const transformedCorners = corners.map(p => applyMatrix(p, matrix));
  return getBoundingBox(transformedCorners)!;
}

/**
 * 두 점 사이의 거리 계산
 */
export function distance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 두 점 사이의 각도 계산 (라디안)
 */
export function angle(p1: Point, p2: Point): number {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x);
}

/**
 * 점을 다른 점 중심으로 회전
 */
export function rotatePoint(point: Point, center: Point, angleDeg: number): Point {
  const rad = angleDeg * Math.PI / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = point.x - center.x;
  const dy = point.y - center.y;

  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos
  };
}
