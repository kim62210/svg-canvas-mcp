/**
 * SVG 파싱 및 직렬화 유틸리티
 */

import type {
  SVGDocument,
  SVGElement,
  CanvasConfig,
  ViewBox,
  Point,
  Gradient,
  Pattern,
  Filter,
  Symbol
} from '../types/index.js';

/**
 * ViewBox 문자열 파싱
 */
export function parseViewBox(viewBoxStr: string): ViewBox | null {
  const parts = viewBoxStr.trim().split(/\s+|,/).map(Number);
  if (parts.length === 4 && parts.every(n => !isNaN(n))) {
    return {
      minX: parts[0],
      minY: parts[1],
      width: parts[2],
      height: parts[3]
    };
  }
  return null;
}

/**
 * ViewBox 객체를 문자열로 변환
 */
export function viewBoxToString(viewBox: ViewBox): string {
  return `${viewBox.minX} ${viewBox.minY} ${viewBox.width} ${viewBox.height}`;
}

/**
 * Points 배열을 SVG points 문자열로 변환
 */
export function pointsToString(points: Point[]): string {
  return points.map(p => `${p.x},${p.y}`).join(' ');
}

/**
 * SVG points 문자열을 Points 배열로 파싱
 */
export function parsePoints(pointsStr: string): Point[] {
  const coords = pointsStr.trim().split(/\s+|,/).map(Number);
  const points: Point[] = [];
  for (let i = 0; i < coords.length - 1; i += 2) {
    if (!isNaN(coords[i]) && !isNaN(coords[i + 1])) {
      points.push({ x: coords[i], y: coords[i + 1] });
    }
  }
  return points;
}

/**
 * SVG 요소를 XML 문자열로 직렬화
 */
export function elementToSVG(element: SVGElement, indent: number = 0): string {
  const spaces = '  '.repeat(indent);
  const attrs = getElementAttributes(element);
  const attrStr = Object.entries(attrs)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k}="${escapeXml(String(v))}"`)
    .join(' ');

  switch (element.type) {
    case 'rect':
    case 'circle':
    case 'ellipse':
    case 'line':
    case 'image':
    case 'use':
      return `${spaces}<${element.type} ${attrStr}/>`;

    case 'polyline':
    case 'polygon':
      return `${spaces}<${element.type} ${attrStr}/>`;

    case 'path':
      return `${spaces}<path ${attrStr}/>`;

    case 'text':
      return `${spaces}<text ${attrStr}>${escapeXml(element.text)}</text>`;

    case 'textpath':
      return `${spaces}<text><textPath ${attrStr}>${escapeXml(element.text)}</textPath></text>`;

    case 'g':
      const children = element.children.map(c => elementToSVG(c, indent + 1)).join('\n');
      if (children) {
        return `${spaces}<g ${attrStr}>\n${children}\n${spaces}</g>`;
      }
      return `${spaces}<g ${attrStr}/>`;

    default:
      return '';
  }
}

/**
 * 요소에서 SVG 속성 추출
 */
function getElementAttributes(element: SVGElement): Record<string, string | number | undefined> {
  const base: Record<string, string | number | undefined> = {
    id: element.id,
    class: element.class,
    style: element.style,
    fill: element.fill,
    stroke: element.stroke,
    'stroke-width': element.strokeWidth,
    opacity: element.opacity,
    transform: element.transform,
    'clip-path': element.clipPath,
    mask: element.mask,
    filter: element.filter,
    'aria-label': element.ariaLabel,
    'aria-hidden': element.ariaHidden ? 'true' : undefined,
    role: element.role
  };

  switch (element.type) {
    case 'rect':
      return { ...base, x: element.x, y: element.y, width: element.width, height: element.height, rx: element.rx, ry: element.ry };
    case 'circle':
      return { ...base, cx: element.cx, cy: element.cy, r: element.r };
    case 'ellipse':
      return { ...base, cx: element.cx, cy: element.cy, rx: element.rx, ry: element.ry };
    case 'line':
      return { ...base, x1: element.x1, y1: element.y1, x2: element.x2, y2: element.y2 };
    case 'polyline':
    case 'polygon':
      return { ...base, points: pointsToString(element.points) };
    case 'path':
      return { ...base, d: element.d };
    case 'text':
      return {
        ...base,
        x: element.x,
        y: element.y,
        'font-family': element.fontFamily,
        'font-size': element.fontSize,
        'font-weight': element.fontWeight,
        'font-style': element.fontStyle,
        'text-anchor': element.textAnchor,
        'dominant-baseline': element.dominantBaseline,
        'letter-spacing': element.letterSpacing,
        'word-spacing': element.wordSpacing,
        'text-decoration': element.textDecoration
      };
    case 'textpath':
      return {
        ...base,
        href: `#${element.pathId}`,
        startOffset: element.startOffset,
        'font-family': element.fontFamily,
        'font-size': element.fontSize
      };
    case 'image':
      return { ...base, href: element.href, x: element.x, y: element.y, width: element.width, height: element.height, preserveAspectRatio: element.preserveAspectRatio };
    case 'use':
      return { ...base, href: `#${element.href}`, x: element.x, y: element.y, width: element.width, height: element.height };
    case 'g':
      return base;
    default:
      return base;
  }
}

/**
 * XML 특수문자 이스케이프
 */
export function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Gradient를 SVG defs 문자열로 변환
 */
export function gradientToSVG(gradient: Gradient, indent: number = 2): string {
  const spaces = '  '.repeat(indent);
  const stops = gradient.stops.map(stop => {
    const opacity = stop.opacity !== undefined ? ` stop-opacity="${stop.opacity}"` : '';
    return `${spaces}  <stop offset="${stop.offset * 100}%" stop-color="${stop.color}"${opacity}/>`;
  }).join('\n');

  if (gradient.type === 'linear') {
    const attrs = [
      `id="${gradient.id}"`,
      gradient.x1 !== undefined ? `x1="${gradient.x1}%"` : '',
      gradient.y1 !== undefined ? `y1="${gradient.y1}%"` : '',
      gradient.x2 !== undefined ? `x2="${gradient.x2}%"` : '',
      gradient.y2 !== undefined ? `y2="${gradient.y2}%"` : '',
      gradient.gradientUnits ? `gradientUnits="${gradient.gradientUnits}"` : '',
      gradient.spreadMethod ? `spreadMethod="${gradient.spreadMethod}"` : ''
    ].filter(Boolean).join(' ');

    return `${spaces}<linearGradient ${attrs}>\n${stops}\n${spaces}</linearGradient>`;
  } else {
    const attrs = [
      `id="${gradient.id}"`,
      gradient.cx !== undefined ? `cx="${gradient.cx}%"` : '',
      gradient.cy !== undefined ? `cy="${gradient.cy}%"` : '',
      gradient.r !== undefined ? `r="${gradient.r}%"` : '',
      gradient.fx !== undefined ? `fx="${gradient.fx}%"` : '',
      gradient.fy !== undefined ? `fy="${gradient.fy}%"` : '',
      gradient.gradientUnits ? `gradientUnits="${gradient.gradientUnits}"` : '',
      gradient.spreadMethod ? `spreadMethod="${gradient.spreadMethod}"` : ''
    ].filter(Boolean).join(' ');

    return `${spaces}<radialGradient ${attrs}>\n${stops}\n${spaces}</radialGradient>`;
  }
}

/**
 * Pattern을 SVG defs 문자열로 변환
 */
export function patternToSVG(pattern: Pattern, indent: number = 2): string {
  const spaces = '  '.repeat(indent);
  const attrs = [
    `id="${pattern.id}"`,
    `width="${pattern.width}"`,
    `height="${pattern.height}"`,
    pattern.patternUnits ? `patternUnits="${pattern.patternUnits}"` : '',
    pattern.patternContentUnits ? `patternContentUnits="${pattern.patternContentUnits}"` : ''
  ].filter(Boolean).join(' ');

  return `${spaces}<pattern ${attrs}>\n${spaces}  ${pattern.content}\n${spaces}</pattern>`;
}

/**
 * Filter를 SVG defs 문자열로 변환
 */
export function filterToSVG(filter: Filter, indent: number = 2): string {
  const spaces = '  '.repeat(indent);
  let content = '';

  switch (filter.type) {
    case 'blur':
      content = `<feGaussianBlur stdDeviation="${filter.params.stdDeviation || 5}"/>`;
      break;
    case 'drop-shadow':
      content = `<feDropShadow dx="${filter.params.dx || 2}" dy="${filter.params.dy || 2}" stdDeviation="${filter.params.stdDeviation || 3}" flood-color="${filter.params.color || 'black'}" flood-opacity="${filter.params.opacity || 0.5}"/>`;
      break;
    case 'brightness':
      content = `<feComponentTransfer><feFuncR type="linear" slope="${filter.params.value}"/><feFuncG type="linear" slope="${filter.params.value}"/><feFuncB type="linear" slope="${filter.params.value}"/></feComponentTransfer>`;
      break;
    case 'grayscale':
      content = `<feColorMatrix type="saturate" values="${1 - (filter.params.value as number || 1)}"/>`;
      break;
    default:
      content = '';
  }

  return `${spaces}<filter id="${filter.id}">\n${spaces}  ${content}\n${spaces}</filter>`;
}

/**
 * Symbol을 SVG defs 문자열로 변환
 */
export function symbolToSVG(symbol: Symbol, indent: number = 2): string {
  const spaces = '  '.repeat(indent);
  const viewBox = symbol.viewBox ? ` viewBox="${symbol.viewBox}"` : '';
  const content = symbol.content.map(el => elementToSVG(el, indent + 1)).join('\n');

  return `${spaces}<symbol id="${symbol.id}"${viewBox}>\n${content}\n${spaces}</symbol>`;
}

/**
 * 전체 SVG 문서를 문자열로 직렬화
 */
export function documentToSVG(doc: SVGDocument, pretty: boolean = true): string {
  const { config, defs, elements } = doc;
  const viewBox = config.viewBox ? viewBoxToString(config.viewBox) : `0 0 ${config.width} ${config.height}`;

  let defsContent = '';
  if (defs.gradients.length || defs.patterns.length || defs.filters.length || defs.symbols.length) {
    const indent = pretty ? 1 : 0;
    const defsItems = [
      ...defs.gradients.map(g => gradientToSVG(g, indent + 1)),
      ...defs.patterns.map(p => patternToSVG(p, indent + 1)),
      ...defs.filters.map(f => filterToSVG(f, indent + 1)),
      ...defs.symbols.map(s => symbolToSVG(s, indent + 1))
    ];
    if (defsItems.length) {
      defsContent = pretty
        ? `  <defs>\n${defsItems.join('\n')}\n  </defs>\n`
        : `<defs>${defsItems.join('')}</defs>`;
    }
  }

  // 배경 rect 추가 (있는 경우)
  let bgRect = '';
  if (config.background) {
    bgRect = pretty
      ? `  <rect width="100%" height="100%" fill="${config.background}"/>\n`
      : `<rect width="100%" height="100%" fill="${config.background}"/>`;
  }

  const elementsContent = elements.map(el => elementToSVG(el, pretty ? 1 : 0)).join(pretty ? '\n' : '');

  const preserveAspectRatio = config.preserveAspectRatio ? ` preserveAspectRatio="${config.preserveAspectRatio}"` : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${config.width}" height="${config.height}" viewBox="${viewBox}"${preserveAspectRatio}>
${defsContent}${bgRect}${elementsContent}
</svg>`;
}

/**
 * SVG 문자열 최소화 (공백/줄바꿈 제거)
 */
export function minifySVG(svg: string): string {
  return svg
    .replace(/>\s+</g, '><')
    .replace(/\s+/g, ' ')
    .replace(/\s*=\s*/g, '=')
    .trim();
}
