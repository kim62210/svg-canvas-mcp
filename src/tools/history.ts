/**
 * History Tools
 * Undo/Redo 및 히스토리 관리
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getCurrentDocument } from '../core/document.js';
import { getHistoryManager } from '../core/history-manager.js';

/**
 * History Tools 등록
 */
export function registerHistoryTools(server: McpServer): void {
  // history_undo: 실행 취소
  server.tool(
    'history_undo',
    '마지막 작업을 취소합니다.',
    {
      steps: z.number().int().min(1).optional().default(1).describe('취소할 단계 수')
    },
    async ({ steps }) => {
      try {
        const historyManager = getHistoryManager();

        if (!historyManager.canUndo()) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: false,
                message: '취소할 작업이 없습니다.'
              }, null, 2)
            }]
          };
        }

        const previousState = historyManager.undo(steps);

        if (previousState) {
          const doc = getCurrentDocument();
          doc.fromJSON(previousState);
        }

        const state = historyManager.getState();

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `${steps}단계 취소되었습니다.`,
              currentIndex: state.currentIndex,
              totalEntries: state.entries.length,
              canUndo: historyManager.canUndo(),
              canRedo: historyManager.canRedo()
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : '취소에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );

  // history_redo: 다시 실행
  server.tool(
    'history_redo',
    '취소한 작업을 다시 실행합니다.',
    {
      steps: z.number().int().min(1).optional().default(1).describe('다시 실행할 단계 수')
    },
    async ({ steps }) => {
      try {
        const historyManager = getHistoryManager();

        if (!historyManager.canRedo()) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: false,
                message: '다시 실행할 작업이 없습니다.'
              }, null, 2)
            }]
          };
        }

        const nextState = historyManager.redo(steps);

        if (nextState) {
          const doc = getCurrentDocument();
          doc.fromJSON(nextState);
        }

        const state = historyManager.getState();

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `${steps}단계 다시 실행되었습니다.`,
              currentIndex: state.currentIndex,
              totalEntries: state.entries.length,
              canUndo: historyManager.canUndo(),
              canRedo: historyManager.canRedo()
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : '다시 실행에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );

  // history_list: 히스토리 목록 조회
  server.tool(
    'history_list',
    '작업 히스토리를 조회합니다.',
    {
      limit: z.number().int().min(1).max(100).optional().default(20).describe('조회할 최대 개수')
    },
    async ({ limit }) => {
      try {
        const historyManager = getHistoryManager();
        const entries = historyManager.getHistory(limit);
        const state = historyManager.getState();

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              currentIndex: state.currentIndex,
              totalEntries: state.entries.length,
              canUndo: historyManager.canUndo(),
              canRedo: historyManager.canRedo(),
              entries: entries.map((e, i) => ({
                index: state.entries.length - entries.length + i,
                action: e.action,
                description: e.description,
                timestamp: e.timestamp.toISOString(),
                isCurrent: (state.entries.length - entries.length + i) === state.currentIndex
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
              error: error instanceof Error ? error.message : '히스토리 조회에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );

  // history_goto: 특정 시점으로 이동
  server.tool(
    'history_goto',
    '히스토리의 특정 시점으로 이동합니다.',
    {
      historyIndex: z.number().int().min(0).describe('이동할 히스토리 인덱스')
    },
    async ({ historyIndex }) => {
      try {
        const historyManager = getHistoryManager();
        const targetState = historyManager.goto(historyIndex);

        if (!targetState) {
          throw new Error(`유효하지 않은 인덱스: ${historyIndex}`);
        }

        const doc = getCurrentDocument();
        doc.fromJSON(targetState);

        const state = historyManager.getState();

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `히스토리 인덱스 ${historyIndex}로 이동했습니다.`,
              currentIndex: state.currentIndex,
              canUndo: historyManager.canUndo(),
              canRedo: historyManager.canRedo()
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : '이동에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );

  // history_clear: 히스토리 초기화
  server.tool(
    'history_clear',
    '모든 히스토리를 삭제합니다. (주의: 되돌릴 수 없음)',
    {},
    async () => {
      try {
        const historyManager = getHistoryManager();
        historyManager.clear();

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: '히스토리가 초기화되었습니다.'
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : '초기화에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );
}
