/**
 * Drawing Tools
 * 기본 도형 그리기 (rect, circle, ellipse, line, polyline, polygon, text, image)
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getCurrentDocument } from '../core/document.js';
import { getLayerManager } from '../core/layer-manager.js';
import { getHistoryManager } from '../core/history-manager.js';
import {
  createRect,
  createCircle,
  createEllipse,
  createLine,
  createPolyline,
  createPolygon,
  createText,
  createImage
} from '../core/element.js';
import type { Point } from '../types/index.js';

// 공통 스타일 스키마
const styleSchema = {
  fill: z.string().optional().describe('채우기 색상 (hex, rgb, 색상명, none)'),
  stroke: z.string().optional().describe('선 색상'),
  strokeWidth: z.number().optional().describe('선 두께'),
  opacity: z.number().min(0).max(1).optional().describe('불투명도 (0-1)'),
  id: z.string().optional().describe('요소 ID (자동 생성됨)'),
  class: z.string().optional().describe('CSS 클래스명')
};

/**
 * Drawing Tools 등록
 */
export function registerDrawingTools(server: McpServer): void {
  // draw_rect: 사각형 그리기
  server.tool(
    'draw_rect',
    '사각형을 그립니다.',
    {
      x: z.number().describe('좌상단 X 좌표'),
      y: z.number().describe('좌상단 Y 좌표'),
      width: z.number().min(0).describe('너비'),
      height: z.number().min(0).describe('높이'),
      rx: z.number().min(0).optional().describe('모서리 X 반경 (둥근 모서리)'),
      ry: z.number().min(0).optional().describe('모서리 Y 반경 (둥근 모서리)'),
      ...styleSchema
    },
    async ({ x, y, width, height, rx, ry, fill, stroke, strokeWidth, opacity, id, class: className }) => {
      try {
        const doc = getCurrentDocument();
        const element = createRect(x, y, width, height, {
          rx, ry, fill, stroke, strokeWidth, opacity, id, class: className
        });

        const elementId = doc.addElement(element);
        getLayerManager().addElementToActiveLayer(elementId);

        // 히스토리에 기록
        getHistoryManager().record(
          'draw_rect',
          `사각형 추가: ${elementId}`,
          doc.toJSON()
        );

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: '사각형이 추가되었습니다.',
              element: {
                id: element.id,
                type: 'rect',
                x, y, width, height,
                rx, ry,
                fill: fill || '#000000',
                stroke, strokeWidth, opacity
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
              error: error instanceof Error ? error.message : '사각형 추가에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );

  // draw_circle: 원 그리기
  server.tool(
    'draw_circle',
    '원을 그립니다.',
    {
      cx: z.number().describe('중심 X 좌표'),
      cy: z.number().describe('중심 Y 좌표'),
      r: z.number().min(0).describe('반지름'),
      ...styleSchema
    },
    async ({ cx, cy, r, fill, stroke, strokeWidth, opacity, id, class: className }) => {
      try {
        const doc = getCurrentDocument();
        const element = createCircle(cx, cy, r, {
          fill, stroke, strokeWidth, opacity, id, class: className
        });

        const elementId = doc.addElement(element);
        getLayerManager().addElementToActiveLayer(elementId);

        getHistoryManager().record(
          'draw_circle',
          `원 추가: ${elementId}`,
          doc.toJSON()
        );

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: '원이 추가되었습니다.',
              element: {
                id: element.id,
                type: 'circle',
                cx, cy, r,
                fill: fill || '#000000',
                stroke, strokeWidth, opacity
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
              error: error instanceof Error ? error.message : '원 추가에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );

  // draw_ellipse: 타원 그리기
  server.tool(
    'draw_ellipse',
    '타원을 그립니다.',
    {
      cx: z.number().describe('중심 X 좌표'),
      cy: z.number().describe('중심 Y 좌표'),
      rx: z.number().min(0).describe('X축 반지름'),
      ry: z.number().min(0).describe('Y축 반지름'),
      ...styleSchema
    },
    async ({ cx, cy, rx, ry, fill, stroke, strokeWidth, opacity, id, class: className }) => {
      try {
        const doc = getCurrentDocument();
        const element = createEllipse(cx, cy, rx, ry, {
          fill, stroke, strokeWidth, opacity, id, class: className
        });

        const elementId = doc.addElement(element);
        getLayerManager().addElementToActiveLayer(elementId);

        getHistoryManager().record(
          'draw_ellipse',
          `타원 추가: ${elementId}`,
          doc.toJSON()
        );

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: '타원이 추가되었습니다.',
              element: {
                id: element.id,
                type: 'ellipse',
                cx, cy, rx, ry,
                fill: fill || '#000000',
                stroke, strokeWidth, opacity
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
              error: error instanceof Error ? error.message : '타원 추가에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );

  // draw_line: 선 그리기
  server.tool(
    'draw_line',
    '직선을 그립니다.',
    {
      x1: z.number().describe('시작점 X 좌표'),
      y1: z.number().describe('시작점 Y 좌표'),
      x2: z.number().describe('끝점 X 좌표'),
      y2: z.number().describe('끝점 Y 좌표'),
      stroke: z.string().optional().default('#000000').describe('선 색상'),
      strokeWidth: z.number().optional().default(1).describe('선 두께'),
      opacity: z.number().min(0).max(1).optional().describe('불투명도'),
      id: z.string().optional().describe('요소 ID'),
      class: z.string().optional().describe('CSS 클래스명')
    },
    async ({ x1, y1, x2, y2, stroke, strokeWidth, opacity, id, class: className }) => {
      try {
        const doc = getCurrentDocument();
        const element = createLine(x1, y1, x2, y2, {
          stroke, strokeWidth, opacity, id, class: className
        });

        const elementId = doc.addElement(element);
        getLayerManager().addElementToActiveLayer(elementId);

        getHistoryManager().record(
          'draw_line',
          `선 추가: ${elementId}`,
          doc.toJSON()
        );

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: '선이 추가되었습니다.',
              element: {
                id: element.id,
                type: 'line',
                x1, y1, x2, y2,
                stroke, strokeWidth, opacity
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
              error: error instanceof Error ? error.message : '선 추가에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );

  // draw_polyline: 연결선 그리기
  server.tool(
    'draw_polyline',
    '여러 점을 연결하는 선을 그립니다.',
    {
      points: z.array(z.object({
        x: z.number(),
        y: z.number()
      })).min(2).describe('점 좌표 배열 [{x, y}, ...]'),
      stroke: z.string().optional().default('#000000').describe('선 색상'),
      strokeWidth: z.number().optional().default(1).describe('선 두께'),
      fill: z.string().optional().default('none').describe('채우기 (보통 none)'),
      opacity: z.number().min(0).max(1).optional().describe('불투명도'),
      id: z.string().optional().describe('요소 ID'),
      class: z.string().optional().describe('CSS 클래스명')
    },
    async ({ points, stroke, strokeWidth, fill, opacity, id, class: className }) => {
      try {
        const doc = getCurrentDocument();
        const element = createPolyline(points as Point[], {
          stroke, strokeWidth, fill, opacity, id, class: className
        });

        const elementId = doc.addElement(element);
        getLayerManager().addElementToActiveLayer(elementId);

        getHistoryManager().record(
          'draw_polyline',
          `연결선 추가: ${elementId} (${points.length}개 점)`,
          doc.toJSON()
        );

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: '연결선이 추가되었습니다.',
              element: {
                id: element.id,
                type: 'polyline',
                pointCount: points.length,
                stroke, strokeWidth, fill, opacity
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
              error: error instanceof Error ? error.message : '연결선 추가에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );

  // draw_polygon: 다각형 그리기
  server.tool(
    'draw_polygon',
    '다각형을 그립니다.',
    {
      points: z.array(z.object({
        x: z.number(),
        y: z.number()
      })).min(3).describe('꼭지점 좌표 배열 [{x, y}, ...]'),
      ...styleSchema
    },
    async ({ points, fill, stroke, strokeWidth, opacity, id, class: className }) => {
      try {
        const doc = getCurrentDocument();
        const element = createPolygon(points as Point[], {
          fill, stroke, strokeWidth, opacity, id, class: className
        });

        const elementId = doc.addElement(element);
        getLayerManager().addElementToActiveLayer(elementId);

        getHistoryManager().record(
          'draw_polygon',
          `다각형 추가: ${elementId} (${points.length}각형)`,
          doc.toJSON()
        );

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: '다각형이 추가되었습니다.',
              element: {
                id: element.id,
                type: 'polygon',
                sides: points.length,
                fill: fill || '#000000',
                stroke, strokeWidth, opacity
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
              error: error instanceof Error ? error.message : '다각형 추가에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );

  // draw_text: 텍스트 추가
  server.tool(
    'draw_text',
    '텍스트를 추가합니다.',
    {
      x: z.number().describe('X 좌표'),
      y: z.number().describe('Y 좌표'),
      text: z.string().describe('텍스트 내용'),
      fontFamily: z.string().optional().describe('폰트 패밀리'),
      fontSize: z.number().optional().describe('폰트 크기 (px)'),
      fontWeight: z.union([z.string(), z.number()]).optional().describe('폰트 굵기'),
      fontStyle: z.string().optional().describe('폰트 스타일 (normal, italic)'),
      textAnchor: z.enum(['start', 'middle', 'end']).optional().describe('텍스트 정렬'),
      fill: z.string().optional().describe('텍스트 색상'),
      stroke: z.string().optional().describe('외곽선 색상'),
      strokeWidth: z.number().optional().describe('외곽선 두께'),
      opacity: z.number().min(0).max(1).optional().describe('불투명도'),
      id: z.string().optional().describe('요소 ID'),
      class: z.string().optional().describe('CSS 클래스명')
    },
    async ({ x, y, text, fontFamily, fontSize, fontWeight, fontStyle, textAnchor, fill, stroke, strokeWidth, opacity, id, class: className }) => {
      try {
        const doc = getCurrentDocument();
        const element = createText(x, y, text, {
          fontFamily, fontSize, fontWeight, fontStyle, textAnchor,
          fill, stroke, strokeWidth, opacity, id, class: className
        });

        const elementId = doc.addElement(element);
        getLayerManager().addElementToActiveLayer(elementId);

        getHistoryManager().record(
          'draw_text',
          `텍스트 추가: ${elementId}`,
          doc.toJSON()
        );

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: '텍스트가 추가되었습니다.',
              element: {
                id: element.id,
                type: 'text',
                x, y,
                text,
                fontFamily, fontSize, fontWeight, fontStyle,
                textAnchor,
                fill: fill || '#000000'
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
              error: error instanceof Error ? error.message : '텍스트 추가에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );

  // draw_image: 이미지 삽입
  server.tool(
    'draw_image',
    '이미지를 삽입합니다.',
    {
      href: z.string().describe('이미지 URL 또는 data URI'),
      x: z.number().describe('X 좌표'),
      y: z.number().describe('Y 좌표'),
      width: z.number().min(0).describe('너비'),
      height: z.number().min(0).describe('높이'),
      preserveAspectRatio: z.string().optional().describe('종횡비 유지 설정'),
      opacity: z.number().min(0).max(1).optional().describe('불투명도'),
      id: z.string().optional().describe('요소 ID'),
      class: z.string().optional().describe('CSS 클래스명')
    },
    async ({ href, x, y, width, height, preserveAspectRatio, opacity, id, class: className }) => {
      try {
        const doc = getCurrentDocument();
        const element = createImage(href, x, y, width, height, {
          preserveAspectRatio, opacity, id, class: className
        });

        const elementId = doc.addElement(element);
        getLayerManager().addElementToActiveLayer(elementId);

        getHistoryManager().record(
          'draw_image',
          `이미지 추가: ${elementId}`,
          doc.toJSON()
        );

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: '이미지가 추가되었습니다.',
              element: {
                id: element.id,
                type: 'image',
                x, y, width, height,
                href: href.length > 100 ? href.substring(0, 100) + '...' : href
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
              error: error instanceof Error ? error.message : '이미지 추가에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );
}
