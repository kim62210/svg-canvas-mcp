/**
 * SVG Path 조작 유틸리티
 */

import type { Point } from '../types/index.js';

// Path 명령어 타입
export type PathCommandType =
  | 'M' | 'm'  // moveto
  | 'L' | 'l'  // lineto
  | 'H' | 'h'  // horizontal lineto
  | 'V' | 'v'  // vertical lineto
  | 'C' | 'c'  // curveto (cubic bezier)
  | 'S' | 's'  // smooth curveto
  | 'Q' | 'q'  // quadratic bezier
  | 'T' | 't'  // smooth quadratic bezier
  | 'A' | 'a'  // arc
  | 'Z' | 'z'; // closepath

// Path 명령어 구조
export interface PathCommand {
  type: PathCommandType;
  values: number[];
}

// Path Builder 클래스
export class PathBuilder {
  private commands: PathCommand[] = [];
  private currentPoint: Point = { x: 0, y: 0 };
  private startPoint: Point = { x: 0, y: 0 };

  /**
   * 시작점으로 이동 (absolute)
   */
  moveTo(x: number, y: number): this {
    this.commands.push({ type: 'M', values: [x, y] });
    this.currentPoint = { x, y };
    this.startPoint = { x, y };
    return this;
  }

  /**
   * 시작점으로 이동 (relative)
   */
  moveBy(dx: number, dy: number): this {
    const x = this.currentPoint.x + dx;
    const y = this.currentPoint.y + dy;
    this.commands.push({ type: 'm', values: [dx, dy] });
    this.currentPoint = { x, y };
    this.startPoint = { x, y };
    return this;
  }

  /**
   * 직선 그리기 (absolute)
   */
  lineTo(x: number, y: number): this {
    this.commands.push({ type: 'L', values: [x, y] });
    this.currentPoint = { x, y };
    return this;
  }

  /**
   * 직선 그리기 (relative)
   */
  lineBy(dx: number, dy: number): this {
    this.commands.push({ type: 'l', values: [dx, dy] });
    this.currentPoint = {
      x: this.currentPoint.x + dx,
      y: this.currentPoint.y + dy
    };
    return this;
  }

  /**
   * 수평선 (absolute)
   */
  horizontalTo(x: number): this {
    this.commands.push({ type: 'H', values: [x] });
    this.currentPoint.x = x;
    return this;
  }

  /**
   * 수평선 (relative)
   */
  horizontalBy(dx: number): this {
    this.commands.push({ type: 'h', values: [dx] });
    this.currentPoint.x += dx;
    return this;
  }

  /**
   * 수직선 (absolute)
   */
  verticalTo(y: number): this {
    this.commands.push({ type: 'V', values: [y] });
    this.currentPoint.y = y;
    return this;
  }

  /**
   * 수직선 (relative)
   */
  verticalBy(dy: number): this {
    this.commands.push({ type: 'v', values: [dy] });
    this.currentPoint.y += dy;
    return this;
  }

  /**
   * 3차 베지어 곡선 (absolute)
   */
  cubicTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): this {
    this.commands.push({ type: 'C', values: [cp1x, cp1y, cp2x, cp2y, x, y] });
    this.currentPoint = { x, y };
    return this;
  }

  /**
   * 3차 베지어 곡선 (relative)
   */
  cubicBy(dcp1x: number, dcp1y: number, dcp2x: number, dcp2y: number, dx: number, dy: number): this {
    this.commands.push({ type: 'c', values: [dcp1x, dcp1y, dcp2x, dcp2y, dx, dy] });
    this.currentPoint = {
      x: this.currentPoint.x + dx,
      y: this.currentPoint.y + dy
    };
    return this;
  }

  /**
   * 부드러운 3차 베지어 곡선 (absolute)
   */
  smoothCubicTo(cp2x: number, cp2y: number, x: number, y: number): this {
    this.commands.push({ type: 'S', values: [cp2x, cp2y, x, y] });
    this.currentPoint = { x, y };
    return this;
  }

  /**
   * 부드러운 3차 베지어 곡선 (relative)
   */
  smoothCubicBy(dcp2x: number, dcp2y: number, dx: number, dy: number): this {
    this.commands.push({ type: 's', values: [dcp2x, dcp2y, dx, dy] });
    this.currentPoint = {
      x: this.currentPoint.x + dx,
      y: this.currentPoint.y + dy
    };
    return this;
  }

  /**
   * 2차 베지어 곡선 (absolute)
   */
  quadraticTo(cpx: number, cpy: number, x: number, y: number): this {
    this.commands.push({ type: 'Q', values: [cpx, cpy, x, y] });
    this.currentPoint = { x, y };
    return this;
  }

  /**
   * 2차 베지어 곡선 (relative)
   */
  quadraticBy(dcpx: number, dcpy: number, dx: number, dy: number): this {
    this.commands.push({ type: 'q', values: [dcpx, dcpy, dx, dy] });
    this.currentPoint = {
      x: this.currentPoint.x + dx,
      y: this.currentPoint.y + dy
    };
    return this;
  }

  /**
   * 부드러운 2차 베지어 곡선 (absolute)
   */
  smoothQuadraticTo(x: number, y: number): this {
    this.commands.push({ type: 'T', values: [x, y] });
    this.currentPoint = { x, y };
    return this;
  }

  /**
   * 부드러운 2차 베지어 곡선 (relative)
   */
  smoothQuadraticBy(dx: number, dy: number): this {
    this.commands.push({ type: 't', values: [dx, dy] });
    this.currentPoint = {
      x: this.currentPoint.x + dx,
      y: this.currentPoint.y + dy
    };
    return this;
  }

  /**
   * 호(arc) 그리기 (absolute)
   */
  arcTo(rx: number, ry: number, rotation: number, largeArc: boolean, sweep: boolean, x: number, y: number): this {
    this.commands.push({
      type: 'A',
      values: [rx, ry, rotation, largeArc ? 1 : 0, sweep ? 1 : 0, x, y]
    });
    this.currentPoint = { x, y };
    return this;
  }

  /**
   * 호(arc) 그리기 (relative)
   */
  arcBy(rx: number, ry: number, rotation: number, largeArc: boolean, sweep: boolean, dx: number, dy: number): this {
    this.commands.push({
      type: 'a',
      values: [rx, ry, rotation, largeArc ? 1 : 0, sweep ? 1 : 0, dx, dy]
    });
    this.currentPoint = {
      x: this.currentPoint.x + dx,
      y: this.currentPoint.y + dy
    };
    return this;
  }

  /**
   * 경로 닫기
   */
  close(): this {
    this.commands.push({ type: 'Z', values: [] });
    this.currentPoint = { ...this.startPoint };
    return this;
  }

  /**
   * Path 문자열 생성
   */
  build(): string {
    return this.commands
      .map(cmd => cmd.type + cmd.values.join(' '))
      .join(' ');
  }

  /**
   * 명령어 배열 반환
   */
  getCommands(): PathCommand[] {
    return [...this.commands];
  }

  /**
   * 초기화
   */
  reset(): this {
    this.commands = [];
    this.currentPoint = { x: 0, y: 0 };
    this.startPoint = { x: 0, y: 0 };
    return this;
  }
}

/**
 * Path 문자열 파싱
 */
export function parsePath(d: string): PathCommand[] {
  const commands: PathCommand[] = [];
  const regex = /([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g;
  let match;

  while ((match = regex.exec(d)) !== null) {
    const type = match[1] as PathCommandType;
    const values = match[2]
      .trim()
      .split(/[\s,]+/)
      .filter(s => s.length > 0)
      .map(Number)
      .filter(n => !isNaN(n));

    commands.push({ type, values });
  }

  return commands;
}

/**
 * Path 명령어 배열을 문자열로 변환
 */
export function commandsToPath(commands: PathCommand[]): string {
  return commands
    .map(cmd => cmd.type + cmd.values.join(','))
    .join(' ');
}

/**
 * 정규 다각형 path 생성
 */
export function regularPolygonPath(cx: number, cy: number, radius: number, sides: number, rotation: number = 0): string {
  const builder = new PathBuilder();
  const angleStep = (2 * Math.PI) / sides;
  const startAngle = rotation - Math.PI / 2;

  for (let i = 0; i < sides; i++) {
    const angle = startAngle + i * angleStep;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);

    if (i === 0) {
      builder.moveTo(x, y);
    } else {
      builder.lineTo(x, y);
    }
  }

  return builder.close().build();
}

/**
 * 별 모양 path 생성
 */
export function starPath(cx: number, cy: number, outerRadius: number, innerRadius: number, points: number, rotation: number = 0): string {
  const builder = new PathBuilder();
  const angleStep = Math.PI / points;
  const startAngle = rotation - Math.PI / 2;

  for (let i = 0; i < points * 2; i++) {
    const angle = startAngle + i * angleStep;
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);

    if (i === 0) {
      builder.moveTo(x, y);
    } else {
      builder.lineTo(x, y);
    }
  }

  return builder.close().build();
}

/**
 * 둥근 모서리 사각형 path 생성
 */
export function roundedRectPath(x: number, y: number, width: number, height: number, radius: number): string {
  const r = Math.min(radius, width / 2, height / 2);
  const builder = new PathBuilder();

  return builder
    .moveTo(x + r, y)
    .lineTo(x + width - r, y)
    .arcTo(r, r, 0, false, true, x + width, y + r)
    .lineTo(x + width, y + height - r)
    .arcTo(r, r, 0, false, true, x + width - r, y + height)
    .lineTo(x + r, y + height)
    .arcTo(r, r, 0, false, true, x, y + height - r)
    .lineTo(x, y + r)
    .arcTo(r, r, 0, false, true, x + r, y)
    .close()
    .build();
}

/**
 * 하트 모양 path 생성
 */
export function heartPath(cx: number, cy: number, size: number): string {
  const builder = new PathBuilder();
  const s = size / 2;

  return builder
    .moveTo(cx, cy + s * 0.3)
    .cubicTo(cx, cy - s * 0.6, cx - s, cy - s * 0.6, cx - s, cy + s * 0.1)
    .cubicTo(cx - s, cy + s * 0.5, cx, cy + s, cx, cy + s)
    .cubicTo(cx, cy + s, cx + s, cy + s * 0.5, cx + s, cy + s * 0.1)
    .cubicTo(cx + s, cy - s * 0.6, cx, cy - s * 0.6, cx, cy + s * 0.3)
    .close()
    .build();
}
