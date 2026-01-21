/**
 * Style Tools
 * 채우기, 선, 그라디언트, 패턴, 필터 등 스타일 설정
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getCurrentDocument } from '../core/document.js';
import { getHistoryManager } from '../core/history-manager.js';
import { generateId } from '../core/id-generator.js';
import type { LinearGradient, RadialGradient, Pattern, Filter, FilterType } from '../types/index.js';

/**
 * Style Tools 등록
 */
export function registerStyleTools(server: McpServer): void {
  // style_fill: 채우기 설정
  server.tool(
    'style_fill',
    '객체의 채우기를 설정합니다.',
    {
      objectId: z.string().describe('객체 ID'),
      fill: z.string().describe('채우기 (색상, none, url(#gradientId))')
    },
    async ({ objectId, fill }) => {
      try {
        const doc = getCurrentDocument();
        const updated = doc.updateElement(objectId, { fill });

        if (!updated) {
          throw new Error(`객체를 찾을 수 없습니다: ${objectId}`);
        }

        getHistoryManager().record(
          'style_fill',
          `채우기 설정: ${objectId} → ${fill}`,
          doc.toJSON()
        );

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: '채우기가 설정되었습니다.',
              objectId,
              fill
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : '채우기 설정에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );

  // style_stroke: 선 설정
  server.tool(
    'style_stroke',
    '객체의 선 스타일을 설정합니다.',
    {
      objectId: z.string().describe('객체 ID'),
      color: z.string().optional().describe('선 색상'),
      width: z.number().min(0).optional().describe('선 두께'),
      dasharray: z.array(z.number()).optional().describe('점선 패턴 [dash, gap, ...]'),
      linecap: z.enum(['butt', 'round', 'square']).optional().describe('선 끝 모양'),
      linejoin: z.enum(['miter', 'round', 'bevel']).optional().describe('선 연결 모양')
    },
    async ({ objectId, color, width, dasharray, linecap, linejoin }) => {
      try {
        const doc = getCurrentDocument();
        const updates: Record<string, unknown> = {};

        if (color !== undefined) updates.stroke = color;
        if (width !== undefined) updates.strokeWidth = width;
        // dasharray, linecap, linejoin은 style 속성으로 처리
        if (dasharray || linecap || linejoin) {
          const styleParts: string[] = [];
          if (dasharray) styleParts.push(`stroke-dasharray: ${dasharray.join(' ')}`);
          if (linecap) styleParts.push(`stroke-linecap: ${linecap}`);
          if (linejoin) styleParts.push(`stroke-linejoin: ${linejoin}`);
          updates.style = styleParts.join('; ');
        }

        const updated = doc.updateElement(objectId, updates);

        if (!updated) {
          throw new Error(`객체를 찾을 수 없습니다: ${objectId}`);
        }

        getHistoryManager().record(
          'style_stroke',
          `선 스타일 설정: ${objectId}`,
          doc.toJSON()
        );

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: '선 스타일이 설정되었습니다.',
              objectId,
              stroke: { color, width, dasharray, linecap, linejoin }
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : '선 설정에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );

  // style_opacity: 불투명도 설정
  server.tool(
    'style_opacity',
    '객체의 불투명도를 설정합니다.',
    {
      objectId: z.string().describe('객체 ID'),
      opacity: z.number().min(0).max(1).describe('불투명도 (0-1)')
    },
    async ({ objectId, opacity }) => {
      try {
        const doc = getCurrentDocument();
        const updated = doc.updateElement(objectId, { opacity });

        if (!updated) {
          throw new Error(`객체를 찾을 수 없습니다: ${objectId}`);
        }

        getHistoryManager().record(
          'style_opacity',
          `불투명도 설정: ${objectId} → ${opacity}`,
          doc.toJSON()
        );

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: '불투명도가 설정되었습니다.',
              objectId,
              opacity
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : '불투명도 설정에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );

  // style_gradient: 그라디언트 정의
  server.tool(
    'style_gradient',
    '그라디언트를 정의합니다. fill에 url(#id)로 사용합니다.',
    {
      type: z.enum(['linear', 'radial']).describe('그라디언트 타입'),
      stops: z.array(z.object({
        offset: z.number().min(0).max(1).describe('위치 (0-1)'),
        color: z.string().describe('색상'),
        opacity: z.number().min(0).max(1).optional().describe('불투명도')
      })).min(2).describe('색상 정지점 배열'),
      id: z.string().optional().describe('그라디언트 ID'),
      // linear gradient options
      x1: z.number().optional().describe('시작 X (%) - linear only'),
      y1: z.number().optional().describe('시작 Y (%) - linear only'),
      x2: z.number().optional().describe('끝 X (%) - linear only'),
      y2: z.number().optional().describe('끝 Y (%) - linear only'),
      // radial gradient options
      cx: z.number().optional().describe('중심 X (%) - radial only'),
      cy: z.number().optional().describe('중심 Y (%) - radial only'),
      r: z.number().optional().describe('반지름 (%) - radial only'),
      fx: z.number().optional().describe('초점 X (%) - radial only'),
      fy: z.number().optional().describe('초점 Y (%) - radial only')
    },
    async ({ type, stops, id, x1, y1, x2, y2, cx, cy, r, fx, fy }) => {
      try {
        const doc = getCurrentDocument();
        const gradientId = id || generateId('gradient');

        if (type === 'linear') {
          const gradient: LinearGradient = {
            id: gradientId,
            type: 'linear',
            x1: x1 ?? 0,
            y1: y1 ?? 0,
            x2: x2 ?? 100,
            y2: y2 ?? 0,
            stops
          };
          doc.addGradient(gradient);
        } else {
          const gradient: RadialGradient = {
            id: gradientId,
            type: 'radial',
            cx: cx ?? 50,
            cy: cy ?? 50,
            r: r ?? 50,
            fx,
            fy,
            stops
          };
          doc.addGradient(gradient);
        }

        getHistoryManager().record(
          'style_gradient',
          `그라디언트 정의: ${gradientId}`,
          doc.toJSON()
        );

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: '그라디언트가 정의되었습니다.',
              gradientId,
              usage: `fill="url(#${gradientId})"`,
              type,
              stopCount: stops.length
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : '그라디언트 정의에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );

  // style_pattern: 패턴 정의
  server.tool(
    'style_pattern',
    '패턴을 정의합니다.',
    {
      width: z.number().min(1).describe('패턴 너비'),
      height: z.number().min(1).describe('패턴 높이'),
      content: z.string().describe('패턴 내용 (SVG 요소)'),
      id: z.string().optional().describe('패턴 ID')
    },
    async ({ width, height, content, id }) => {
      try {
        const doc = getCurrentDocument();
        const patternId = id || generateId('pattern');

        const pattern: Pattern = {
          id: patternId,
          width,
          height,
          patternUnits: 'userSpaceOnUse',
          content
        };

        doc.addPattern(pattern);

        getHistoryManager().record(
          'style_pattern',
          `패턴 정의: ${patternId}`,
          doc.toJSON()
        );

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: '패턴이 정의되었습니다.',
              patternId,
              usage: `fill="url(#${patternId})"`,
              size: { width, height }
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : '패턴 정의에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );

  // style_filter: 필터 적용
  server.tool(
    'style_filter',
    '객체에 필터를 적용합니다.',
    {
      objectId: z.string().describe('객체 ID'),
      filterType: z.enum(['blur', 'drop-shadow', 'brightness', 'grayscale']).describe('필터 타입'),
      params: z.record(z.union([z.number(), z.string()])).describe('필터 파라미터')
    },
    async ({ objectId, filterType, params }) => {
      try {
        const doc = getCurrentDocument();
        const filterId = generateId('filter');

        const filter: Filter = {
          id: filterId,
          type: filterType as FilterType,
          params
        };

        doc.addFilter(filter);
        doc.updateElement(objectId, { filter: `url(#${filterId})` });

        getHistoryManager().record(
          'style_filter',
          `필터 적용: ${objectId} ← ${filterType}`,
          doc.toJSON()
        );

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: '필터가 적용되었습니다.',
              objectId,
              filterId,
              filterType,
              params
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : '필터 적용에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );

  // style_remove_filter: 필터 제거
  server.tool(
    'style_remove_filter',
    '객체에서 필터를 제거합니다.',
    {
      objectId: z.string().describe('객체 ID')
    },
    async ({ objectId }) => {
      try {
        const doc = getCurrentDocument();
        doc.updateElement(objectId, { filter: undefined });

        getHistoryManager().record(
          'style_remove_filter',
          `필터 제거: ${objectId}`,
          doc.toJSON()
        );

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: '필터가 제거되었습니다.',
              objectId
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : '필터 제거에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );
}
