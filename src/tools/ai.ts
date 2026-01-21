/**
 * AI 보조 Tools
 * 색상 추천, 정렬 제안, 패턴 자동 완성 등
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getCurrentDocument } from '../core/document.js';
import { getElementBounds } from '../core/element.js';
import {
  generateHarmony,
  adjustBrightness,
  complementaryColor,
  mixColors,
  hexToRgb,
  rgbToHsl
} from '../utils/color-utils.js';

/**
 * AI Tools 등록
 */
export function registerAITools(server: McpServer): void {
  // ai_suggest_colors: 색상 팔레트 추천
  server.tool(
    'ai_suggest_colors',
    '기준 색상을 바탕으로 조화로운 색상 팔레트를 추천합니다.',
    {
      baseColor: z.string().describe('기준 색상 (hex)'),
      harmony: z.enum(['complementary', 'triadic', 'analogous', 'split-complementary']).describe('색상 조화 타입'),
      includeShades: z.boolean().optional().default(true).describe('명도 변형 포함')
    },
    async ({ baseColor, harmony, includeShades }) => {
      try {
        const colors = generateHarmony(baseColor, harmony);

        let palette: Array<{ color: string; name: string; shades?: string[] }> = colors.map((c, i) => ({
          color: c,
          name: i === 0 ? 'Base' : `${harmony} ${i}`
        }));

        if (includeShades) {
          palette = palette.map(item => ({
            ...item,
            shades: [
              adjustBrightness(item.color, 40),
              adjustBrightness(item.color, 20),
              item.color,
              adjustBrightness(item.color, -20),
              adjustBrightness(item.color, -40)
            ]
          }));
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              baseColor,
              harmonyType: harmony,
              palette,
              cssVariables: palette.map((p, i) =>
                `--color-${i + 1}: ${p.color};`
              ).join('\n'),
              usage: 'style_fill 또는 style_gradient에서 이 색상들을 사용하세요.'
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : '색상 추천에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );

  // ai_analyze_colors: 캔버스 색상 분석
  server.tool(
    'ai_analyze_colors',
    '현재 캔버스에서 사용된 색상을 분석합니다.',
    {},
    async () => {
      try {
        const doc = getCurrentDocument();
        const elements = doc.getAllElements();

        const colors = new Map<string, number>();

        function extractColors(el: typeof elements[0]) {
          if (el.fill && el.fill !== 'none' && !el.fill.startsWith('url(')) {
            colors.set(el.fill, (colors.get(el.fill) || 0) + 1);
          }
          if (el.stroke && el.stroke !== 'none' && !el.stroke.startsWith('url(')) {
            colors.set(el.stroke, (colors.get(el.stroke) || 0) + 1);
          }
          if (el.type === 'g') {
            el.children.forEach(extractColors);
          }
        }

        elements.forEach(extractColors);

        const colorList = Array.from(colors.entries())
          .map(([color, count]) => {
            const rgb = hexToRgb(color);
            const hsl = rgb ? rgbToHsl(rgb.r, rgb.g, rgb.b) : null;
            return {
              color,
              count,
              hsl: hsl ? `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)` : null
            };
          })
          .sort((a, b) => b.count - a.count);

        // 주요 색상 (가장 많이 사용된 3개)
        const dominantColors = colorList.slice(0, 3);

        // 색상 조화 분석
        let harmonyAnalysis = '분석 불가';
        if (dominantColors.length >= 2) {
          const comp = complementaryColor(dominantColors[0].color);
          const isComplementary = dominantColors.some(c =>
            c.color.toLowerCase() === comp.toLowerCase()
          );
          harmonyAnalysis = isComplementary ? '보색 조화' : '자유 배색';
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              totalColors: colorList.length,
              dominantColors,
              allColors: colorList,
              harmonyAnalysis,
              suggestion: dominantColors.length > 0
                ? `기준 색상 ${dominantColors[0].color}으로 ai_suggest_colors를 사용해보세요.`
                : '캔버스에 색상이 있는 요소를 추가하세요.'
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : '색상 분석에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );

  // ai_align_objects: 객체 자동 정렬 제안
  server.tool(
    'ai_align_objects',
    '선택한 객체들의 정렬 방법을 제안합니다.',
    {
      objectIds: z.array(z.string()).min(2).describe('정렬할 객체 ID 목록'),
      mode: z.enum(['horizontal', 'vertical', 'grid', 'circle', 'auto']).optional().default('auto').describe('정렬 모드')
    },
    async ({ objectIds, mode }) => {
      try {
        const doc = getCurrentDocument();
        const elements: Array<{ id: string; bounds: ReturnType<typeof getElementBounds> }> = [];

        for (const id of objectIds) {
          const el = doc.getElementById(id);
          if (el) {
            elements.push({ id, bounds: getElementBounds(el) });
          }
        }

        if (elements.length < 2) {
          throw new Error('정렬할 객체가 2개 이상 필요합니다.');
        }

        // 경계 상자가 있는 요소만 필터링
        const validElements = elements.filter(e => e.bounds !== null) as Array<{
          id: string;
          bounds: NonNullable<ReturnType<typeof getElementBounds>>;
        }>;

        // 전체 영역 계산
        const allBounds = {
          minX: Math.min(...validElements.map(e => e.bounds.x)),
          minY: Math.min(...validElements.map(e => e.bounds.y)),
          maxX: Math.max(...validElements.map(e => e.bounds.x + e.bounds.width)),
          maxY: Math.max(...validElements.map(e => e.bounds.y + e.bounds.height))
        };

        const totalWidth = allBounds.maxX - allBounds.minX;
        const totalHeight = allBounds.maxY - allBounds.minY;

        // 정렬 제안 계산
        let suggestions: Array<{ type: string; description: string; commands: string[] }> = [];

        const actualMode = mode === 'auto'
          ? (totalWidth > totalHeight ? 'horizontal' : 'vertical')
          : mode;

        switch (actualMode) {
          case 'horizontal':
            {
              const spacing = totalWidth / (validElements.length - 1);
              const centerY = allBounds.minY + totalHeight / 2;
              suggestions.push({
                type: '수평 균등 배치',
                description: `${validElements.length}개 객체를 수평으로 균등 배치`,
                commands: validElements.map((e, i) => {
                  const newX = allBounds.minX + i * spacing - e.bounds.width / 2;
                  const newY = centerY - e.bounds.height / 2;
                  const dx = newX - e.bounds.x;
                  const dy = newY - e.bounds.y;
                  return `object_move(${e.id}, dx=${dx.toFixed(1)}, dy=${dy.toFixed(1)})`;
                })
              });
            }
            break;

          case 'vertical':
            {
              const spacing = totalHeight / (validElements.length - 1);
              const centerX = allBounds.minX + totalWidth / 2;
              suggestions.push({
                type: '수직 균등 배치',
                description: `${validElements.length}개 객체를 수직으로 균등 배치`,
                commands: validElements.map((e, i) => {
                  const newX = centerX - e.bounds.width / 2;
                  const newY = allBounds.minY + i * spacing - e.bounds.height / 2;
                  const dx = newX - e.bounds.x;
                  const dy = newY - e.bounds.y;
                  return `object_move(${e.id}, dx=${dx.toFixed(1)}, dy=${dy.toFixed(1)})`;
                })
              });
            }
            break;

          case 'grid':
            {
              const cols = Math.ceil(Math.sqrt(validElements.length));
              const rows = Math.ceil(validElements.length / cols);
              const cellWidth = totalWidth / cols;
              const cellHeight = totalHeight / rows;

              suggestions.push({
                type: '그리드 배치',
                description: `${cols}x${rows} 그리드로 배치`,
                commands: validElements.map((e, i) => {
                  const col = i % cols;
                  const row = Math.floor(i / cols);
                  const newX = allBounds.minX + col * cellWidth + cellWidth / 2 - e.bounds.width / 2;
                  const newY = allBounds.minY + row * cellHeight + cellHeight / 2 - e.bounds.height / 2;
                  const dx = newX - e.bounds.x;
                  const dy = newY - e.bounds.y;
                  return `object_move(${e.id}, dx=${dx.toFixed(1)}, dy=${dy.toFixed(1)})`;
                })
              });
            }
            break;

          case 'circle':
            {
              const centerX = allBounds.minX + totalWidth / 2;
              const centerY = allBounds.minY + totalHeight / 2;
              const radius = Math.min(totalWidth, totalHeight) / 2;
              const angleStep = (2 * Math.PI) / validElements.length;

              suggestions.push({
                type: '원형 배치',
                description: `반지름 ${radius.toFixed(0)}px 원형으로 배치`,
                commands: validElements.map((e, i) => {
                  const angle = i * angleStep - Math.PI / 2;
                  const newX = centerX + radius * Math.cos(angle) - e.bounds.width / 2;
                  const newY = centerY + radius * Math.sin(angle) - e.bounds.height / 2;
                  const dx = newX - e.bounds.x;
                  const dy = newY - e.bounds.y;
                  return `object_move(${e.id}, dx=${dx.toFixed(1)}, dy=${dy.toFixed(1)})`;
                })
              });
            }
            break;
        }

        // 기본 정렬 옵션 추가
        suggestions.push({
          type: '왼쪽 정렬',
          description: '모든 객체의 왼쪽 가장자리 정렬',
          commands: validElements.map(e => {
            const dx = allBounds.minX - e.bounds.x;
            return dx !== 0 ? `object_move(${e.id}, dx=${dx.toFixed(1)}, dy=0)` : null;
          }).filter(Boolean) as string[]
        });

        suggestions.push({
          type: '상단 정렬',
          description: '모든 객체의 상단 가장자리 정렬',
          commands: validElements.map(e => {
            const dy = allBounds.minY - e.bounds.y;
            return dy !== 0 ? `object_move(${e.id}, dx=0, dy=${dy.toFixed(1)})` : null;
          }).filter(Boolean) as string[]
        });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              objectCount: validElements.length,
              currentBounds: allBounds,
              recommendedMode: actualMode,
              suggestions: suggestions.filter(s => s.commands.length > 0),
              note: '제안된 commands를 object_move 도구로 실행하세요.'
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : '정렬 제안에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );

  // ai_suggest_layout: 레이아웃 제안
  server.tool(
    'ai_suggest_layout',
    '캔버스 크기에 맞는 레이아웃을 제안합니다.',
    {
      contentType: z.enum(['icon', 'banner', 'card', 'infographic', 'logo']).describe('콘텐츠 유형'),
      elementCount: z.number().int().min(1).max(20).optional().default(5).describe('예상 요소 개수')
    },
    async ({ contentType, elementCount }) => {
      try {
        const doc = getCurrentDocument();
        const info = doc.getCanvasInfo();
        const { width, height } = info;

        let layout: {
          name: string;
          description: string;
          zones: Array<{ name: string; x: number; y: number; width: number; height: number }>;
          suggestions: string[];
        };

        switch (contentType) {
          case 'icon':
            const padding = Math.min(width, height) * 0.1;
            layout = {
              name: '아이콘 레이아웃',
              description: '중앙 집중형 아이콘 디자인',
              zones: [
                { name: 'main', x: padding, y: padding, width: width - padding * 2, height: height - padding * 2 }
              ],
              suggestions: [
                '단순한 도형과 패스를 사용하세요',
                '24x24 또는 48x48 viewBox를 권장합니다',
                '선 두께를 일관되게 유지하세요'
              ]
            };
            break;

          case 'banner':
            layout = {
              name: '배너 레이아웃',
              description: '가로형 배너 디자인',
              zones: [
                { name: 'logo', x: 20, y: height * 0.3, width: width * 0.15, height: height * 0.4 },
                { name: 'title', x: width * 0.2, y: height * 0.2, width: width * 0.5, height: height * 0.3 },
                { name: 'subtitle', x: width * 0.2, y: height * 0.55, width: width * 0.5, height: height * 0.2 },
                { name: 'cta', x: width * 0.75, y: height * 0.3, width: width * 0.2, height: height * 0.4 }
              ],
              suggestions: [
                '왼쪽에서 오른쪽으로 시선 유도',
                '제목은 크고 대비되는 색상 사용',
                'CTA 버튼은 눈에 띄는 색상으로'
              ]
            };
            break;

          case 'card':
            layout = {
              name: '카드 레이아웃',
              description: '정보 카드 디자인',
              zones: [
                { name: 'image', x: 0, y: 0, width: width, height: height * 0.5 },
                { name: 'title', x: width * 0.05, y: height * 0.55, width: width * 0.9, height: height * 0.15 },
                { name: 'content', x: width * 0.05, y: height * 0.72, width: width * 0.9, height: height * 0.2 }
              ],
              suggestions: [
                '상단에 시각적 요소 배치',
                '제목은 1-2줄로 제한',
                '여백을 충분히 확보'
              ]
            };
            break;

          case 'infographic':
            const rows = Math.ceil(elementCount / 2);
            layout = {
              name: '인포그래픽 레이아웃',
              description: `${elementCount}개 항목 배치`,
              zones: Array.from({ length: elementCount }, (_, i) => {
                const col = i % 2;
                const row = Math.floor(i / 2);
                return {
                  name: `item-${i + 1}`,
                  x: col * (width / 2) + width * 0.05,
                  y: row * (height / rows) + height * 0.05,
                  width: width * 0.4,
                  height: (height / rows) * 0.8
                };
              }),
              suggestions: [
                '각 섹션에 아이콘 + 텍스트 조합',
                '일관된 색상 팔레트 사용',
                '데이터 시각화는 차트/그래프 활용'
              ]
            };
            break;

          case 'logo':
          default:
            layout = {
              name: '로고 레이아웃',
              description: '로고 디자인 가이드',
              zones: [
                { name: 'symbol', x: width * 0.1, y: height * 0.2, width: width * 0.3, height: height * 0.6 },
                { name: 'wordmark', x: width * 0.45, y: height * 0.35, width: width * 0.45, height: height * 0.3 }
              ],
              suggestions: [
                '심볼과 워드마크 균형 유지',
                '단순하고 기억에 남는 형태',
                '다양한 크기에서 테스트'
              ]
            };
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              canvasSize: { width, height },
              contentType,
              layout,
              nextSteps: [
                '각 zone에 맞는 요소를 draw_* 도구로 추가하세요',
                'ai_suggest_colors로 색상 팔레트를 생성하세요',
                'layer_create로 각 zone을 별도 레이어로 관리하세요'
              ]
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : '레이아웃 제안에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );
}
