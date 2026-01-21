/**
 * Symbol & Template Tools
 * 심볼 정의/사용 및 템플릿 관리
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getCurrentDocument } from '../core/document.js';
import { getHistoryManager } from '../core/history-manager.js';
import { getTemplateManager } from '../core/template-manager.js';
import { generateId } from '../core/id-generator.js';
import { createUse } from '../core/element.js';
import { getLayerManager } from '../core/layer-manager.js';
import type { Symbol } from '../types/index.js';

/**
 * Symbol & Template Tools 등록
 */
export function registerSymbolTools(server: McpServer): void {
  // symbol_define: 심볼 정의
  server.tool(
    'symbol_define',
    '객체를 재사용 가능한 심볼로 정의합니다.',
    {
      objectId: z.string().describe('심볼로 만들 객체 ID'),
      symbolId: z.string().optional().describe('심볼 ID'),
      viewBox: z.string().optional().describe('심볼의 viewBox')
    },
    async ({ objectId, symbolId, viewBox }) => {
      try {
        const doc = getCurrentDocument();
        const element = doc.getElementById(objectId);

        if (!element) {
          throw new Error(`객체를 찾을 수 없습니다: ${objectId}`);
        }

        const id = symbolId || generateId('symbol');
        const symbol: Symbol = {
          id,
          viewBox,
          content: [element]
        };

        doc.addSymbol(symbol);

        getHistoryManager().record(
          'symbol_define',
          `심볼 정의: ${id}`,
          doc.toJSON()
        );

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: '심볼이 정의되었습니다.',
              symbolId: id,
              sourceObjectId: objectId,
              usage: `<use href="#${id}" x="0" y="0"/>`
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : '심볼 정의에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );

  // symbol_use: 심볼 사용
  server.tool(
    'symbol_use',
    '정의된 심볼을 배치합니다.',
    {
      symbolId: z.string().describe('사용할 심볼 ID'),
      x: z.number().describe('X 좌표'),
      y: z.number().describe('Y 좌표'),
      width: z.number().optional().describe('너비'),
      height: z.number().optional().describe('높이'),
      fill: z.string().optional().describe('채우기 색상 (심볼 재정의)'),
      stroke: z.string().optional().describe('선 색상 (심볼 재정의)')
    },
    async ({ symbolId, x, y, width, height, fill, stroke }) => {
      try {
        const doc = getCurrentDocument();
        const symbol = doc.getSymbol(symbolId);

        if (!symbol) {
          throw new Error(`심볼을 찾을 수 없습니다: ${symbolId}`);
        }

        const useElement = createUse(symbolId, {
          x, y, width, height, fill, stroke
        });

        const elementId = doc.addElement(useElement);
        getLayerManager().addElementToActiveLayer(elementId);

        getHistoryManager().record(
          'symbol_use',
          `심볼 사용: ${symbolId} at (${x}, ${y})`,
          doc.toJSON()
        );

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: '심볼이 배치되었습니다.',
              elementId,
              symbolId,
              position: { x, y },
              size: width && height ? { width, height } : undefined
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : '심볼 배치에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );

  // template_save: 템플릿 저장
  server.tool(
    'template_save',
    '현재 캔버스를 템플릿으로 저장합니다.',
    {
      name: z.string().describe('템플릿 이름'),
      description: z.string().optional().describe('설명'),
      tags: z.array(z.string()).optional().describe('태그 목록'),
      category: z.enum(['icons', 'shapes', 'layouts']).optional().default('shapes').describe('카테고리')
    },
    async ({ name, description, tags, category }) => {
      try {
        const doc = getCurrentDocument();
        const svg = doc.exportSVG({ pretty: true });
        const info = doc.getCanvasInfo();

        const templateManager = getTemplateManager();
        const template = await templateManager.saveTemplate(name, svg, {
          description,
          tags,
          category,
          width: info.width,
          height: info.height
        });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: '템플릿이 저장되었습니다.',
              template: {
                id: template.id,
                name: template.name,
                category: template.category,
                tags: template.tags
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
              error: error instanceof Error ? error.message : '템플릿 저장에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );

  // template_load: 템플릿 불러오기
  server.tool(
    'template_load',
    '저장된 템플릿을 불러옵니다.',
    {
      templateName: z.string().describe('템플릿 이름 또는 ID')
    },
    async ({ templateName }) => {
      try {
        const templateManager = getTemplateManager();
        let template = await templateManager.getTemplate(templateName);

        if (!template) {
          template = await templateManager.findTemplateByName(templateName);
        }

        if (!template) {
          throw new Error(`템플릿을 찾을 수 없습니다: ${templateName}`);
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: '템플릿을 불러왔습니다.',
              template: {
                id: template.id,
                name: template.name,
                description: template.description,
                category: template.category,
                tags: template.tags,
                size: template.metadata
              },
              content: template.content
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : '템플릿 불러오기에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );

  // template_list: 템플릿 목록
  server.tool(
    'template_list',
    '저장된 템플릿 목록을 조회합니다.',
    {
      category: z.enum(['icons', 'shapes', 'layouts']).optional().describe('카테고리 필터'),
      tags: z.array(z.string()).optional().describe('태그 필터'),
      search: z.string().optional().describe('검색어')
    },
    async ({ category, tags, search }) => {
      try {
        const templateManager = getTemplateManager();
        const templates = await templateManager.listTemplates({ category, tags, search });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              count: templates.length,
              templates: templates.map(t => ({
                id: t.id,
                name: t.name,
                description: t.description,
                category: t.category,
                tags: t.tags,
                size: { width: t.metadata.width, height: t.metadata.height }
              }))
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : '목록 조회에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );

  // template_delete: 템플릿 삭제
  server.tool(
    'template_delete',
    '저장된 템플릿을 삭제합니다.',
    {
      templateId: z.string().describe('삭제할 템플릿 ID')
    },
    async ({ templateId }) => {
      try {
        const templateManager = getTemplateManager();
        const deleted = await templateManager.deleteTemplate(templateId);

        if (!deleted) {
          throw new Error(`템플릿을 찾을 수 없습니다: ${templateId}`);
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: '템플릿이 삭제되었습니다.',
              deletedId: templateId
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : '템플릿 삭제에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );
}
