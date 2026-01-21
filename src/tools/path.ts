/**
 * Path Tools
 * 패스 생성 및 조작 (베지어 곡선, 호, 패스 합성 등)
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getCurrentDocument } from '../core/document.js';
import { getLayerManager } from '../core/layer-manager.js';
import { getHistoryManager } from '../core/history-manager.js';
import { createPath } from '../core/element.js';
import {
  PathBuilder,
  regularPolygonPath,
  starPath,
  roundedRectPath,
  heartPath
} from '../utils/path-utils.js';

// 활성 PathBuilder 인스턴스 (path_create ~ path_close 사이에 사용)
let activePathBuilder: PathBuilder | null = null;

/**
 * Path Tools 등록
 */
export function registerPathTools(server: McpServer): void {
  // draw_path: 패스 데이터로 직접 그리기
  server.tool(
    'draw_path',
    'SVG 패스 데이터(d 속성)로 직접 경로를 그립니다.',
    {
      d: z.string().describe('SVG 패스 데이터 (예: "M10 10 L90 90 Z")'),
      fill: z.string().optional().describe('채우기 색상'),
      stroke: z.string().optional().describe('선 색상'),
      strokeWidth: z.number().optional().describe('선 두께'),
      opacity: z.number().min(0).max(1).optional().describe('불투명도'),
      id: z.string().optional().describe('요소 ID'),
      class: z.string().optional().describe('CSS 클래스명')
    },
    async ({ d, fill, stroke, strokeWidth, opacity, id, class: className }) => {
      try {
        const doc = getCurrentDocument();
        const element = createPath(d, {
          fill, stroke, strokeWidth, opacity, id, class: className
        });

        const elementId = doc.addElement(element);
        getLayerManager().addElementToActiveLayer(elementId);

        getHistoryManager().record(
          'draw_path',
          `패스 추가: ${elementId}`,
          doc.toJSON()
        );

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: '패스가 추가되었습니다.',
              element: {
                id: element.id,
                type: 'path',
                d: d.length > 100 ? d.substring(0, 100) + '...' : d,
                fill, stroke, strokeWidth
              }
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : '패스 추가에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );

  // path_create: 새 패스 시작
  server.tool(
    'path_create',
    '새 패스 빌더를 시작합니다. path_lineto, path_curveto 등으로 경로를 추가한 후 path_finish로 완료합니다.',
    {
      startX: z.number().describe('시작점 X 좌표'),
      startY: z.number().describe('시작점 Y 좌표')
    },
    async ({ startX, startY }) => {
      try {
        activePathBuilder = new PathBuilder();
        activePathBuilder.moveTo(startX, startY);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `패스 빌더가 시작되었습니다. 시작점: (${startX}, ${startY})`,
              currentPath: activePathBuilder.build()
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : '패스 시작에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );

  // path_lineto: 직선 추가
  server.tool(
    'path_lineto',
    '현재 패스에 직선을 추가합니다.',
    {
      x: z.number().describe('끝점 X 좌표'),
      y: z.number().describe('끝점 Y 좌표'),
      relative: z.boolean().optional().default(false).describe('상대 좌표 여부')
    },
    async ({ x, y, relative }) => {
      try {
        if (!activePathBuilder) {
          throw new Error('먼저 path_create로 패스를 시작하세요.');
        }

        if (relative) {
          activePathBuilder.lineBy(x, y);
        } else {
          activePathBuilder.lineTo(x, y);
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `직선 추가: ${relative ? '상대' : '절대'} (${x}, ${y})`,
              currentPath: activePathBuilder.build()
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : '직선 추가에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );

  // path_curveto: 베지어 곡선 추가
  server.tool(
    'path_curveto',
    '현재 패스에 베지어 곡선을 추가합니다.',
    {
      type: z.enum(['Q', 'C', 'S', 'T']).describe('곡선 타입 (Q: 2차 베지어, C: 3차 베지어, S: 부드러운 3차, T: 부드러운 2차)'),
      controlPoints: z.array(z.object({
        x: z.number(),
        y: z.number()
      })).describe('제어점 배열 (Q: 1개, C: 2개, S: 1개, T: 0개)'),
      endX: z.number().describe('끝점 X 좌표'),
      endY: z.number().describe('끝점 Y 좌표'),
      relative: z.boolean().optional().default(false).describe('상대 좌표 여부')
    },
    async ({ type, controlPoints, endX, endY, relative }) => {
      try {
        if (!activePathBuilder) {
          throw new Error('먼저 path_create로 패스를 시작하세요.');
        }

        const cp = controlPoints;

        switch (type) {
          case 'Q': // 2차 베지어
            if (cp.length < 1) throw new Error('2차 베지어는 제어점 1개가 필요합니다.');
            if (relative) {
              activePathBuilder.quadraticBy(cp[0].x, cp[0].y, endX, endY);
            } else {
              activePathBuilder.quadraticTo(cp[0].x, cp[0].y, endX, endY);
            }
            break;

          case 'C': // 3차 베지어
            if (cp.length < 2) throw new Error('3차 베지어는 제어점 2개가 필요합니다.');
            if (relative) {
              activePathBuilder.cubicBy(cp[0].x, cp[0].y, cp[1].x, cp[1].y, endX, endY);
            } else {
              activePathBuilder.cubicTo(cp[0].x, cp[0].y, cp[1].x, cp[1].y, endX, endY);
            }
            break;

          case 'S': // 부드러운 3차 베지어
            if (cp.length < 1) throw new Error('부드러운 3차 베지어는 제어점 1개가 필요합니다.');
            if (relative) {
              activePathBuilder.smoothCubicBy(cp[0].x, cp[0].y, endX, endY);
            } else {
              activePathBuilder.smoothCubicTo(cp[0].x, cp[0].y, endX, endY);
            }
            break;

          case 'T': // 부드러운 2차 베지어
            if (relative) {
              activePathBuilder.smoothQuadraticBy(endX, endY);
            } else {
              activePathBuilder.smoothQuadraticTo(endX, endY);
            }
            break;
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `${type} 곡선 추가됨`,
              currentPath: activePathBuilder.build()
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : '곡선 추가에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );

  // path_arcto: 호 추가
  server.tool(
    'path_arcto',
    '현재 패스에 호(arc)를 추가합니다.',
    {
      rx: z.number().min(0).describe('X축 반지름'),
      ry: z.number().min(0).describe('Y축 반지름'),
      rotation: z.number().optional().default(0).describe('회전 각도 (도)'),
      largeArc: z.boolean().optional().default(false).describe('큰 호 선택'),
      sweep: z.boolean().optional().default(true).describe('시계 방향'),
      x: z.number().describe('끝점 X 좌표'),
      y: z.number().describe('끝점 Y 좌표'),
      relative: z.boolean().optional().default(false).describe('상대 좌표 여부')
    },
    async ({ rx, ry, rotation, largeArc, sweep, x, y, relative }) => {
      try {
        if (!activePathBuilder) {
          throw new Error('먼저 path_create로 패스를 시작하세요.');
        }

        if (relative) {
          activePathBuilder.arcBy(rx, ry, rotation, largeArc, sweep, x, y);
        } else {
          activePathBuilder.arcTo(rx, ry, rotation, largeArc, sweep, x, y);
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: '호가 추가되었습니다.',
              currentPath: activePathBuilder.build()
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : '호 추가에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );

  // path_close: 패스 닫기
  server.tool(
    'path_close',
    '현재 패스를 닫습니다 (시작점으로 연결).',
    {},
    async () => {
      try {
        if (!activePathBuilder) {
          throw new Error('먼저 path_create로 패스를 시작하세요.');
        }

        activePathBuilder.close();

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: '패스가 닫혔습니다.',
              currentPath: activePathBuilder.build()
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : '패스 닫기에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );

  // path_finish: 패스 완료 및 요소로 추가
  server.tool(
    'path_finish',
    '패스 빌더를 완료하고 SVG 요소로 추가합니다.',
    {
      fill: z.string().optional().describe('채우기 색상'),
      stroke: z.string().optional().describe('선 색상'),
      strokeWidth: z.number().optional().describe('선 두께'),
      opacity: z.number().min(0).max(1).optional().describe('불투명도'),
      id: z.string().optional().describe('요소 ID'),
      class: z.string().optional().describe('CSS 클래스명'),
      closePath: z.boolean().optional().default(false).describe('패스를 닫을지 여부')
    },
    async ({ fill, stroke, strokeWidth, opacity, id, class: className, closePath }) => {
      try {
        if (!activePathBuilder) {
          throw new Error('먼저 path_create로 패스를 시작하세요.');
        }

        if (closePath) {
          activePathBuilder.close();
        }

        const d = activePathBuilder.build();
        const doc = getCurrentDocument();
        const element = createPath(d, {
          fill, stroke, strokeWidth, opacity, id, class: className
        });

        const elementId = doc.addElement(element);
        getLayerManager().addElementToActiveLayer(elementId);

        getHistoryManager().record(
          'path_finish',
          `패스 완료: ${elementId}`,
          doc.toJSON()
        );

        // 빌더 초기화
        activePathBuilder = null;

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: '패스가 완료되어 추가되었습니다.',
              element: {
                id: element.id,
                type: 'path',
                d,
                fill, stroke, strokeWidth
              }
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : '패스 완료에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );

  // path_cancel: 패스 빌더 취소
  server.tool(
    'path_cancel',
    '현재 패스 빌더를 취소합니다.',
    {},
    async () => {
      activePathBuilder = null;
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: '패스 빌더가 취소되었습니다.'
          }, null, 2)
        }]
      };
    }
  );

  // draw_regular_polygon: 정다각형 그리기
  server.tool(
    'draw_regular_polygon',
    '정다각형을 그립니다.',
    {
      cx: z.number().describe('중심 X 좌표'),
      cy: z.number().describe('중심 Y 좌표'),
      radius: z.number().min(0).describe('반지름'),
      sides: z.number().min(3).max(100).describe('변의 개수'),
      rotation: z.number().optional().default(0).describe('회전 각도 (도)'),
      fill: z.string().optional().describe('채우기 색상'),
      stroke: z.string().optional().describe('선 색상'),
      strokeWidth: z.number().optional().describe('선 두께'),
      opacity: z.number().min(0).max(1).optional().describe('불투명도'),
      id: z.string().optional().describe('요소 ID')
    },
    async ({ cx, cy, radius, sides, rotation, fill, stroke, strokeWidth, opacity, id }) => {
      try {
        const d = regularPolygonPath(cx, cy, radius, sides, rotation * Math.PI / 180);
        const doc = getCurrentDocument();
        const element = createPath(d, { fill, stroke, strokeWidth, opacity, id });

        const elementId = doc.addElement(element);
        getLayerManager().addElementToActiveLayer(elementId);

        getHistoryManager().record(
          'draw_regular_polygon',
          `정${sides}각형 추가: ${elementId}`,
          doc.toJSON()
        );

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `정${sides}각형이 추가되었습니다.`,
              element: {
                id: element.id,
                type: 'path',
                shape: `정${sides}각형`,
                cx, cy, radius, rotation
              }
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : '정다각형 추가에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );

  // draw_star: 별 모양 그리기
  server.tool(
    'draw_star',
    '별 모양을 그립니다.',
    {
      cx: z.number().describe('중심 X 좌표'),
      cy: z.number().describe('중심 Y 좌표'),
      outerRadius: z.number().min(0).describe('외부 반지름'),
      innerRadius: z.number().min(0).describe('내부 반지름'),
      points: z.number().min(3).max(50).describe('꼭지점 개수'),
      rotation: z.number().optional().default(0).describe('회전 각도 (도)'),
      fill: z.string().optional().describe('채우기 색상'),
      stroke: z.string().optional().describe('선 색상'),
      strokeWidth: z.number().optional().describe('선 두께'),
      opacity: z.number().min(0).max(1).optional().describe('불투명도'),
      id: z.string().optional().describe('요소 ID')
    },
    async ({ cx, cy, outerRadius, innerRadius, points, rotation, fill, stroke, strokeWidth, opacity, id }) => {
      try {
        const d = starPath(cx, cy, outerRadius, innerRadius, points, rotation * Math.PI / 180);
        const doc = getCurrentDocument();
        const element = createPath(d, { fill, stroke, strokeWidth, opacity, id });

        const elementId = doc.addElement(element);
        getLayerManager().addElementToActiveLayer(elementId);

        getHistoryManager().record(
          'draw_star',
          `별(${points}각) 추가: ${elementId}`,
          doc.toJSON()
        );

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `${points}각 별이 추가되었습니다.`,
              element: {
                id: element.id,
                type: 'path',
                shape: `${points}각 별`,
                cx, cy, outerRadius, innerRadius
              }
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : '별 추가에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );

  // draw_heart: 하트 모양 그리기
  server.tool(
    'draw_heart',
    '하트 모양을 그립니다.',
    {
      cx: z.number().describe('중심 X 좌표'),
      cy: z.number().describe('중심 Y 좌표'),
      size: z.number().min(0).describe('크기'),
      fill: z.string().optional().default('#e74c3c').describe('채우기 색상'),
      stroke: z.string().optional().describe('선 색상'),
      strokeWidth: z.number().optional().describe('선 두께'),
      opacity: z.number().min(0).max(1).optional().describe('불투명도'),
      id: z.string().optional().describe('요소 ID')
    },
    async ({ cx, cy, size, fill, stroke, strokeWidth, opacity, id }) => {
      try {
        const d = heartPath(cx, cy, size);
        const doc = getCurrentDocument();
        const element = createPath(d, { fill, stroke, strokeWidth, opacity, id });

        const elementId = doc.addElement(element);
        getLayerManager().addElementToActiveLayer(elementId);

        getHistoryManager().record(
          'draw_heart',
          `하트 추가: ${elementId}`,
          doc.toJSON()
        );

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: '하트가 추가되었습니다.',
              element: {
                id: element.id,
                type: 'path',
                shape: 'heart',
                cx, cy, size, fill
              }
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : '하트 추가에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );

  // draw_rounded_rect: 둥근 모서리 사각형 (패스로)
  server.tool(
    'draw_rounded_rect_path',
    '둥근 모서리 사각형을 패스로 그립니다 (모서리별 다른 반경 가능).',
    {
      x: z.number().describe('X 좌표'),
      y: z.number().describe('Y 좌표'),
      width: z.number().min(0).describe('너비'),
      height: z.number().min(0).describe('높이'),
      radius: z.number().min(0).describe('모서리 반경'),
      fill: z.string().optional().describe('채우기 색상'),
      stroke: z.string().optional().describe('선 색상'),
      strokeWidth: z.number().optional().describe('선 두께'),
      opacity: z.number().min(0).max(1).optional().describe('불투명도'),
      id: z.string().optional().describe('요소 ID')
    },
    async ({ x, y, width, height, radius, fill, stroke, strokeWidth, opacity, id }) => {
      try {
        const d = roundedRectPath(x, y, width, height, radius);
        const doc = getCurrentDocument();
        const element = createPath(d, { fill, stroke, strokeWidth, opacity, id });

        const elementId = doc.addElement(element);
        getLayerManager().addElementToActiveLayer(elementId);

        getHistoryManager().record(
          'draw_rounded_rect_path',
          `둥근 사각형 추가: ${elementId}`,
          doc.toJSON()
        );

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: '둥근 모서리 사각형이 추가되었습니다.',
              element: {
                id: element.id,
                type: 'path',
                shape: 'rounded-rect',
                x, y, width, height, radius
              }
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : '둥근 사각형 추가에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );
}
