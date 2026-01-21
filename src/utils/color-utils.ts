/**
 * 색상 처리 유틸리티
 */

// RGB 색상 타입
export interface RGB {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
}

// HSL 색상 타입
export interface HSL {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
}

// RGBA 색상 타입
export interface RGBA extends RGB {
  a: number; // 0-1
}

// 명명된 색상 매핑 (일부)
const namedColors: Record<string, string> = {
  black: '#000000',
  white: '#ffffff',
  red: '#ff0000',
  green: '#008000',
  blue: '#0000ff',
  yellow: '#ffff00',
  cyan: '#00ffff',
  magenta: '#ff00ff',
  orange: '#ffa500',
  purple: '#800080',
  pink: '#ffc0cb',
  brown: '#a52a2a',
  gray: '#808080',
  grey: '#808080',
  silver: '#c0c0c0',
  gold: '#ffd700',
  navy: '#000080',
  teal: '#008080',
  olive: '#808000',
  lime: '#00ff00',
  aqua: '#00ffff',
  maroon: '#800000',
  transparent: 'transparent',
  none: 'none',
  currentColor: 'currentColor'
};

/**
 * HEX 색상 유효성 검사
 */
export function isValidHex(color: string): boolean {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(color);
}

/**
 * RGB 문자열 유효성 검사
 */
export function isValidRgb(color: string): boolean {
  return /^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/i.test(color);
}

/**
 * RGBA 문자열 유효성 검사
 */
export function isValidRgba(color: string): boolean {
  return /^rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*(0|1|0?\.\d+)\s*\)$/i.test(color);
}

/**
 * HSL 문자열 유효성 검사
 */
export function isValidHsl(color: string): boolean {
  return /^hsl\(\s*\d{1,3}\s*,\s*\d{1,3}%?\s*,\s*\d{1,3}%?\s*\)$/i.test(color);
}

/**
 * 명명된 색상인지 확인
 */
export function isNamedColor(color: string): boolean {
  return color.toLowerCase() in namedColors;
}

/**
 * 색상 유효성 검사 (모든 형식)
 */
export function isValidColor(color: string): boolean {
  return (
    isValidHex(color) ||
    isValidRgb(color) ||
    isValidRgba(color) ||
    isValidHsl(color) ||
    isNamedColor(color) ||
    color.startsWith('url(')
  );
}

/**
 * HEX를 RGB로 변환
 */
export function hexToRgb(hex: string): RGB | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    };
  }

  // 3자리 HEX 처리
  const shortResult = /^#?([a-f\d])([a-f\d])([a-f\d])$/i.exec(hex);
  if (shortResult) {
    return {
      r: parseInt(shortResult[1] + shortResult[1], 16),
      g: parseInt(shortResult[2] + shortResult[2], 16),
      b: parseInt(shortResult[3] + shortResult[3], 16)
    };
  }

  return null;
}

/**
 * RGB를 HEX로 변환
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (c: number) => {
    const hex = Math.max(0, Math.min(255, Math.round(c))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return '#' + toHex(r) + toHex(g) + toHex(b);
}

/**
 * RGB를 HSL로 변환
 */
export function rgbToHsl(r: number, g: number, b: number): HSL {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

/**
 * HSL를 RGB로 변환
 */
export function hslToRgb(h: number, s: number, l: number): RGB {
  h /= 360;
  s /= 100;
  l /= 100;

  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
}

/**
 * 명명된 색상을 HEX로 변환
 */
export function namedToHex(name: string): string | null {
  return namedColors[name.toLowerCase()] || null;
}

/**
 * 색상을 HEX로 정규화
 */
export function normalizeToHex(color: string): string | null {
  if (isNamedColor(color)) {
    const hex = namedToHex(color);
    return hex === 'transparent' || hex === 'none' || hex === 'currentColor' ? color : hex;
  }

  if (isValidHex(color)) {
    // 3자리를 6자리로 확장
    if (color.length === 4) {
      return '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
    }
    return color;
  }

  if (isValidRgb(color) || isValidRgba(color)) {
    const match = color.match(/\d+/g);
    if (match && match.length >= 3) {
      return rgbToHex(parseInt(match[0]), parseInt(match[1]), parseInt(match[2]));
    }
  }

  return null;
}

/**
 * 색상 밝기 조절
 * @param color HEX 색상
 * @param amount 조절량 (-100 ~ 100)
 */
export function adjustBrightness(color: string, amount: number): string {
  const rgb = hexToRgb(color);
  if (!rgb) return color;

  const adjust = (c: number) => Math.max(0, Math.min(255, c + (amount * 2.55)));

  return rgbToHex(adjust(rgb.r), adjust(rgb.g), adjust(rgb.b));
}

/**
 * 보색 계산
 */
export function complementaryColor(color: string): string {
  const rgb = hexToRgb(color);
  if (!rgb) return color;

  return rgbToHex(255 - rgb.r, 255 - rgb.g, 255 - rgb.b);
}

/**
 * 색상 조화 팔레트 생성
 */
export function generateHarmony(baseColor: string, type: 'complementary' | 'triadic' | 'analogous' | 'split-complementary'): string[] {
  const rgb = hexToRgb(baseColor);
  if (!rgb) return [baseColor];

  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const colors: string[] = [baseColor];

  // HSL을 RGB로 변환 후 Hex로 변환하는 헬퍼 함수
  const hslToHex = (h: number, s: number, l: number): string => {
    const { r, g, b } = hslToRgb(h, s, l);
    return rgbToHex(r, g, b);
  };

  switch (type) {
    case 'complementary':
      colors.push(hslToHex((hsl.h + 180) % 360, hsl.s, hsl.l));
      break;

    case 'triadic':
      colors.push(hslToHex((hsl.h + 120) % 360, hsl.s, hsl.l));
      colors.push(hslToHex((hsl.h + 240) % 360, hsl.s, hsl.l));
      break;

    case 'analogous':
      colors.push(hslToHex((hsl.h + 30) % 360, hsl.s, hsl.l));
      colors.push(hslToHex((hsl.h + 330) % 360, hsl.s, hsl.l));
      break;

    case 'split-complementary':
      colors.push(hslToHex((hsl.h + 150) % 360, hsl.s, hsl.l));
      colors.push(hslToHex((hsl.h + 210) % 360, hsl.s, hsl.l));
      break;
  }

  return colors;
}

/**
 * 색상 간 혼합
 */
export function mixColors(color1: string, color2: string, ratio: number = 0.5): string {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) return color1;

  const r = Math.round(rgb1.r * (1 - ratio) + rgb2.r * ratio);
  const g = Math.round(rgb1.g * (1 - ratio) + rgb2.g * ratio);
  const b = Math.round(rgb1.b * (1 - ratio) + rgb2.b * ratio);

  return rgbToHex(r, g, b);
}
