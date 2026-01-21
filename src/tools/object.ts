/**
 * Object Tools
 * 객체 선택, 이동, 크기 조절, 회전, 삭제, 복제, 그룹화 등
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getCurrentDocument } from '../core/document.js';
import { getLayerManager } from '../core/layer-manager.js';
import { getHistoryManager } from '../core/history-manager.js';
import { createGroup, getElementBounds, cloneElement } from '../core/element.js';
import { transformToString } from '../utils/transform-utils.js';
import type { SVGElement, GroupElement } from '../types/index.js';

/**
 * Object Tools 등록
 */
export function registerObjectTools(server: McpServer): void {
  // object_select: 객체 선택/조회
  server.tool(
    'object_select',
    '객체를 ID로 선택하고 정보를 조회합니다.',
    {
      objectId: z.string().describe('객체 ID')
    },
    async ({ objectId }) => {
      try {
        const doc = getCurrentDocument();
        const element = doc.getElementById(objectId);

        if (!element) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: `객체를 찾을 수 없습니다: ${objectId}`
              })
            }],
            isError: true
          };
        }

        const bounds = getElementBounds(element);
        const layer = getLayerManager().findLayerByElement(objectId);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              element: {
                id: element.id,
                type: element.type,
                bounds,
                layer: layer ? { id: layer.id, name: layer.name } : null,
                fill: element.fill,
                stroke: element.stroke,
                strokeWidth: element.strokeWidth,
                opacity: element.opacity,
                transform: element.transform
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
              error: error instanceof Error ? error.message : '객체 조회에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );

  // object_list: 모든 객체 목록
  server.tool(
    'object_list',
    '캔버스의 모든 객체 목록을 조회합니다.',
    {
      layerId: z.string().optional().describe('특정 레이어만 조회 (선택)')
    },
    async ({ layerId }) => {
      try {
        const doc = getCurrentDocument();
        const elements = doc.getAllElements();
        const layerManager = getLayerManager();

        let filteredElements = elements;
        if (layerId) {
          const layer = layerManager.getLayer(layerId);
          if (layer) {
            filteredElements = elements.filter(el => layer.elements.includes(el.id));
          }
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              count: filteredElements.length,
              objects: filteredElements.map(el => ({
                id: el.id,
                type: el.type,
                bounds: getElementBounds(el)
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

  // object_move: 객체 이동
  server.tool(
    'object_move',
    '객체를 이동합니다.',
    {
      objectId: z.string().describe('객체 ID'),
      dx: z.number().describe('X 이동량'),
      dy: z.number().describe('Y 이동량')
    },
    async ({ objectId, dx, dy }) => {
      try {
        const doc = getCurrentDocument();
        const element = doc.getElementById(objectId);

        if (!element) {
          throw new Error(`객체를 찾을 수 없습니다: ${objectId}`);
        }

        // 현재 transform에 translate 추가
        const currentTransform = element.transform || '';
        const newTransform = `${currentTransform} translate(${dx}, ${dy})`.trim();
        doc.updateElement(objectId, { transform: newTransform });

        getHistoryManager().record(
          'object_move',
          `객체 이동: ${objectId} (${dx}, ${dy})`,
          doc.toJSON()
        );

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `객체가 이동되었습니다.`,
              objectId,
              movement: { dx, dy }
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

  // object_scale: 객체 크기 조절
  server.tool(
    'object_scale',
    '객체 크기를 조절합니다.',
    {
      objectId: z.string().describe('객체 ID'),
      scaleX: z.number().describe('X 스케일 배율'),
      scaleY: z.number().optional().describe('Y 스케일 배율 (생략 시 scaleX와 동일)'),
      originX: z.number().optional().describe('변환 기준점 X'),
      originY: z.number().optional().describe('변환 기준점 Y')
    },
    async ({ objectId, scaleX, scaleY, originX, originY }) => {
      try {
        const doc = getCurrentDocument();
        const element = doc.getElementById(objectId);

        if (!element) {
          throw new Error(`객체를 찾을 수 없습니다: ${objectId}`);
        }

        const sy = scaleY ?? scaleX;
        const currentTransform = element.transform || '';

        let scaleTransform: string;
        if (originX !== undefined && originY !== undefined) {
          scaleTransform = `translate(${originX}, ${originY}) scale(${scaleX}, ${sy}) translate(${-originX}, ${-originY})`;
        } else {
          scaleTransform = `scale(${scaleX}, ${sy})`;
        }

        const newTransform = `${currentTransform} ${scaleTransform}`.trim();
        doc.updateElement(objectId, { transform: newTransform });

        getHistoryManager().record(
          'object_scale',
          `객체 크기 조절: ${objectId} (${scaleX}, ${sy})`,
          doc.toJSON()
        );

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: '객체 크기가 조절되었습니다.',
              objectId,
              scale: { x: scaleX, y: sy }
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : '크기 조절에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );

  // object_rotate: 객체 회전
  server.tool(
    'object_rotate',
    '객체를 회전합니다.',
    {
      objectId: z.string().describe('객체 ID'),
      angle: z.number().describe('회전 각도 (도)'),
      originX: z.number().optional().describe('회전 중심 X'),
      originY: z.number().optional().describe('회전 중심 Y')
    },
    async ({ objectId, angle, originX, originY }) => {
      try {
        const doc = getCurrentDocument();
        const element = doc.getElementById(objectId);

        if (!element) {
          throw new Error(`객체를 찾을 수 없습니다: ${objectId}`);
        }

        const currentTransform = element.transform || '';

        let rotateTransform: string;
        if (originX !== undefined && originY !== undefined) {
          rotateTransform = `rotate(${angle}, ${originX}, ${originY})`;
        } else {
          rotateTransform = `rotate(${angle})`;
        }

        const newTransform = `${currentTransform} ${rotateTransform}`.trim();
        doc.updateElement(objectId, { transform: newTransform });

        getHistoryManager().record(
          'object_rotate',
          `객체 회전: ${objectId} (${angle}°)`,
          doc.toJSON()
        );

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: '객체가 회전되었습니다.',
              objectId,
              angle
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : '회전에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );

  // object_delete: 객체 삭제
  server.tool(
    'object_delete',
    '객체를 삭제합니다.',
    {
      objectId: z.string().describe('삭제할 객체 ID')
    },
    async ({ objectId }) => {
      try {
        const doc = getCurrentDocument();
        const removed = doc.removeElement(objectId);

        if (!removed) {
          throw new Error(`객체를 찾을 수 없습니다: ${objectId}`);
        }

        // 레이어에서도 제거
        getLayerManager().removeElementFromLayer(objectId);

        getHistoryManager().record(
          'object_delete',
          `객체 삭제: ${objectId}`,
          doc.toJSON()
        );

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: '객체가 삭제되었습니다.',
              deletedId: objectId
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : '삭제에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );

  // object_duplicate: 객체 복제
  server.tool(
    'object_duplicate',
    '객체를 복제합니다.',
    {
      objectId: z.string().describe('복제할 객체 ID'),
      offsetX: z.number().optional().default(10).describe('X 오프셋'),
      offsetY: z.number().optional().default(10).describe('Y 오프셋')
    },
    async ({ objectId, offsetX, offsetY }) => {
      try {
        const doc = getCurrentDocument();
        const newId = doc.duplicateElement(objectId, { x: offsetX, y: offsetY });

        if (!newId) {
          throw new Error(`객체를 찾을 수 없습니다: ${objectId}`);
        }

        // 활성 레이어에 추가
        getLayerManager().addElementToActiveLayer(newId);

        getHistoryManager().record(
          'object_duplicate',
          `객체 복제: ${objectId} → ${newId}`,
          doc.toJSON()
        );

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: '객체가 복제되었습니다.',
              originalId: objectId,
              newId,
              offset: { x: offsetX, y: offsetY }
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : '복제에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );

  // object_group: 객체 그룹화
  server.tool(
    'object_group',
    '여러 객체를 그룹으로 묶습니다.',
    {
      objectIds: z.array(z.string()).min(1).describe('그룹화할 객체 ID 배열'),
      groupId: z.string().optional().describe('그룹 ID (선택)')
    },
    async ({ objectIds, groupId }) => {
      try {
        const doc = getCurrentDocument();
        const elements: SVGElement[] = [];

        // 객체들을 수집
        for (const id of objectIds) {
          const element = doc.getElementById(id);
          if (element) {
            elements.push(element);
          }
        }

        if (elements.length === 0) {
          throw new Error('그룹화할 객체가 없습니다.');
        }

        // 그룹 생성
        const group = createGroup(elements, { id: groupId });

        // 원본 요소들 제거
        for (const id of objectIds) {
          doc.removeElement(id);
          getLayerManager().removeElementFromLayer(id);
        }

        // 그룹 추가
        const newGroupId = doc.addElement(group);
        getLayerManager().addElementToActiveLayer(newGroupId);

        getHistoryManager().record(
          'object_group',
          `객체 그룹화: ${objectIds.length}개 → ${newGroupId}`,
          doc.toJSON()
        );

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: '객체들이 그룹화되었습니다.',
              groupId: newGroupId,
              memberCount: elements.length,
              memberIds: objectIds
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : '그룹화에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );

  // object_ungroup: 그룹 해제
  server.tool(
    'object_ungroup',
    '그룹을 해제합니다.',
    {
      groupId: z.string().describe('해제할 그룹 ID')
    },
    async ({ groupId }) => {
      try {
        const doc = getCurrentDocument();
        const element = doc.getElementById(groupId);

        if (!element || element.type !== 'g') {
          throw new Error('유효한 그룹이 아닙니다.');
        }

        const group = element as GroupElement;
        const childIds: string[] = [];

        // 자식 요소들을 상위로 이동
        for (const child of group.children) {
          const childId = doc.addElement(child);
          childIds.push(childId);
          getLayerManager().addElementToActiveLayer(childId);
        }

        // 그룹 제거
        doc.removeElement(groupId);
        getLayerManager().removeElementFromLayer(groupId);

        getHistoryManager().record(
          'object_ungroup',
          `그룹 해제: ${groupId} → ${childIds.length}개 객체`,
          doc.toJSON()
        );

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: '그룹이 해제되었습니다.',
              ungroupedId: groupId,
              releasedIds: childIds
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : '그룹 해제에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );

  // object_order: 객체 순서 변경
  server.tool(
    'object_order',
    '객체의 Z 순서를 변경합니다.',
    {
      objectId: z.string().describe('객체 ID'),
      direction: z.enum(['front', 'back', 'forward', 'backward']).describe('이동 방향')
    },
    async ({ objectId, direction }) => {
      try {
        const doc = getCurrentDocument();
        const success = doc.reorderElement(objectId, direction);

        if (!success) {
          throw new Error(`객체를 찾을 수 없습니다: ${objectId}`);
        }

        getHistoryManager().record(
          'object_order',
          `객체 순서 변경: ${objectId} → ${direction}`,
          doc.toJSON()
        );

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `객체가 ${direction}로 이동되었습니다.`,
              objectId,
              direction
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : '순서 변경에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );
}
