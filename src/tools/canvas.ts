/**
 * Canvas 관리 Tools
 * 캔버스 생성, 열기, 저장, 정보 조회 등
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getCurrentDocument, SVGDocumentManager, setCurrentDocument } from '../core/document.js';
import { getLayerManager, resetLayerManager } from '../core/layer-manager.js';
import { getHistoryManager, resetHistoryManager } from '../core/history-manager.js';

/**
 * Canvas Tools 등록
 */
export function registerCanvasTools(server: McpServer): void {
  // svg_create: 새 캔버스 생성
  server.tool(
    'svg_create',
    '새 SVG 캔버스를 생성합니다.',
    {
      width: z.number().min(1).max(10000).describe('캔버스 너비 (px)'),
      height: z.number().min(1).max(10000).describe('캔버스 높이 (px)'),
      viewBox: z.string().optional().describe('viewBox 속성 (예: "0 0 800 600")'),
      background: z.string().optional().describe('배경색 (hex, rgb, 색상명)'),
      preserveAspectRatio: z.string().optional().describe('preserveAspectRatio 속성')
    },
    async ({ width, height, viewBox, background, preserveAspectRatio }) => {
      try {
        // 새 문서 생성
        const doc = new SVGDocumentManager();
        doc.create(width, height, { viewBox, background, preserveAspectRatio });
        setCurrentDocument(doc);

        // 레이어 및 히스토리 초기화
        resetLayerManager();
        resetHistoryManager();

        const info = doc.getCanvasInfo();

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `${width}x${height} 캔버스가 생성되었습니다.`,
              canvas: {
                width: info.width,
                height: info.height,
                viewBox: viewBox || `0 0 ${width} ${height}`,
                background: background || 'transparent',
                elementCount: 0
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
              error: error instanceof Error ? error.message : '알 수 없는 오류'
            })
          }],
          isError: true
        };
      }
    }
  );

  // svg_open: 기존 SVG 파일 열기
  server.tool(
    'svg_open',
    '기존 SVG 파일을 엽니다.',
    {
      filePath: z.string().describe('SVG 파일 경로')
    },
    async ({ filePath }) => {
      try {
        const doc = new SVGDocumentManager();
        await doc.open(filePath);
        setCurrentDocument(doc);

        // 레이어 및 히스토리 초기화
        resetLayerManager();
        resetHistoryManager();

        const info = doc.getCanvasInfo();

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `파일을 열었습니다: ${filePath}`,
              canvas: {
                width: info.width,
                height: info.height,
                elementCount: info.elementCount,
                filePath: info.filePath
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
              error: error instanceof Error ? error.message : '파일을 열 수 없습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );

  // svg_save: 현재 캔버스 저장
  server.tool(
    'svg_save',
    '현재 캔버스를 SVG 파일로 저장합니다.',
    {
      filePath: z.string().optional().describe('저장할 파일 경로 (없으면 기존 경로 사용)')
    },
    async ({ filePath }) => {
      try {
        const doc = getCurrentDocument();
        const savedPath = await doc.save(filePath);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `파일이 저장되었습니다.`,
              filePath: savedPath
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : '저장에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );

  // svg_info: 캔버스 정보 조회
  server.tool(
    'svg_info',
    '현재 캔버스의 정보를 조회합니다.',
    {},
    async () => {
      try {
        const doc = getCurrentDocument();
        const info = doc.getCanvasInfo();
        const layers = getLayerManager().getLayers();
        const history = getHistoryManager().getState();

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              canvas: {
                width: info.width,
                height: info.height,
                viewBox: info.viewBox,
                background: info.background,
                elementCount: info.elementCount,
                filePath: info.filePath,
                isDirty: info.isDirty
              },
              layers: {
                count: layers.length,
                list: layers.map(l => ({
                  id: l.id,
                  name: l.name,
                  visible: l.visible,
                  locked: l.locked,
                  elementCount: l.elements.length
                }))
              },
              history: {
                totalEntries: history.entries.length,
                currentIndex: history.currentIndex,
                canUndo: history.currentIndex >= 0,
                canRedo: history.currentIndex < history.entries.length - 1
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
              error: error instanceof Error ? error.message : '정보 조회에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );

  // svg_resize: 캔버스 크기 변경
  server.tool(
    'svg_resize',
    '캔버스 크기를 변경합니다.',
    {
      width: z.number().min(1).max(10000).describe('새 너비 (px)'),
      height: z.number().min(1).max(10000).describe('새 높이 (px)'),
      scaleContent: z.boolean().optional().default(false).describe('내용도 함께 스케일링할지 여부')
    },
    async ({ width, height, scaleContent }) => {
      try {
        const doc = getCurrentDocument();
        const oldInfo = doc.getCanvasInfo();

        doc.resize(width, height, scaleContent);

        // 히스토리에 기록
        getHistoryManager().record(
          'resize',
          `캔버스 크기 변경: ${oldInfo.width}x${oldInfo.height} → ${width}x${height}`,
          doc.toJSON()
        );

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `캔버스 크기가 ${width}x${height}로 변경되었습니다.`,
              previous: { width: oldInfo.width, height: oldInfo.height },
              current: { width, height },
              contentScaled: scaleContent
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : '크기 변경에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );

  // svg_set_background: 배경색 설정
  server.tool(
    'svg_set_background',
    '캔버스 배경색을 설정합니다.',
    {
      color: z.string().optional().describe('배경색 (hex, rgb, 색상명). 비우면 투명')
    },
    async ({ color }) => {
      try {
        const doc = getCurrentDocument();
        doc.setBackground(color);

        // 히스토리에 기록
        getHistoryManager().record(
          'set_background',
          `배경색 변경: ${color || '투명'}`,
          doc.toJSON()
        );

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: color ? `배경색이 ${color}로 설정되었습니다.` : '배경이 투명으로 설정되었습니다.',
              background: color || 'transparent'
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : '배경색 설정에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );
}
