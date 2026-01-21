/**
 * Layer Tools
 * 레이어 생성, 삭제, 관리
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getLayerManager } from '../core/layer-manager.js';
import type { BlendMode } from '../types/layer.js';

const BLEND_MODES: BlendMode[] = [
  'normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten',
  'color-dodge', 'color-burn', 'hard-light', 'soft-light',
  'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity'
];

/**
 * Layer Tools 등록
 */
export function registerLayerTools(server: McpServer): void {
  // layer_create: 새 레이어 생성
  server.tool(
    'layer_create',
    '새 레이어를 생성합니다.',
    {
      name: z.string().optional().describe('레이어 이름'),
      insertAt: z.number().int().min(0).optional().describe('삽입 위치 인덱스')
    },
    async ({ name, insertAt }) => {
      const manager = getLayerManager();
      const result = manager.createLayer(name, insertAt);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: result.success,
            message: result.message,
            layerId: result.layerId,
            totalLayers: manager.getLayerCount()
          }, null, 2)
        }]
      };
    }
  );

  // layer_delete: 레이어 삭제
  server.tool(
    'layer_delete',
    '레이어를 삭제합니다.',
    {
      layerId: z.string().describe('삭제할 레이어 ID')
    },
    async ({ layerId }) => {
      const manager = getLayerManager();
      const result = manager.deleteLayer(layerId);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: result.success,
            message: result.message,
            remainingLayers: manager.getLayerCount()
          }, null, 2)
        }],
        isError: !result.success
      };
    }
  );

  // layer_rename: 레이어 이름 변경
  server.tool(
    'layer_rename',
    '레이어 이름을 변경합니다.',
    {
      layerId: z.string().describe('레이어 ID'),
      newName: z.string().describe('새 이름')
    },
    async ({ layerId, newName }) => {
      const manager = getLayerManager();
      const result = manager.renameLayer(layerId, newName);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: result.success,
            message: result.message
          }, null, 2)
        }],
        isError: !result.success
      };
    }
  );

  // layer_reorder: 레이어 순서 변경
  server.tool(
    'layer_reorder',
    '레이어 순서를 변경합니다.',
    {
      layerId: z.string().describe('레이어 ID'),
      newIndex: z.number().int().min(0).describe('새 인덱스 (0이 가장 아래)')
    },
    async ({ layerId, newIndex }) => {
      const manager = getLayerManager();
      const result = manager.reorderLayer(layerId, newIndex);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: result.success,
            message: result.message
          }, null, 2)
        }],
        isError: !result.success
      };
    }
  );

  // layer_visibility: 레이어 표시/숨김
  server.tool(
    'layer_visibility',
    '레이어의 표시/숨김 상태를 설정합니다.',
    {
      layerId: z.string().describe('레이어 ID'),
      visible: z.boolean().describe('표시 여부')
    },
    async ({ layerId, visible }) => {
      const manager = getLayerManager();
      const result = manager.setLayerVisibility(layerId, visible);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: result.success,
            message: result.message
          }, null, 2)
        }],
        isError: !result.success
      };
    }
  );

  // layer_lock: 레이어 잠금
  server.tool(
    'layer_lock',
    '레이어의 잠금 상태를 설정합니다.',
    {
      layerId: z.string().describe('레이어 ID'),
      locked: z.boolean().describe('잠금 여부')
    },
    async ({ layerId, locked }) => {
      const manager = getLayerManager();
      const result = manager.setLayerLock(layerId, locked);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: result.success,
            message: result.message
          }, null, 2)
        }],
        isError: !result.success
      };
    }
  );

  // layer_opacity: 레이어 불투명도 설정
  server.tool(
    'layer_opacity',
    '레이어의 불투명도를 설정합니다.',
    {
      layerId: z.string().describe('레이어 ID'),
      opacity: z.number().min(0).max(1).describe('불투명도 (0-1)')
    },
    async ({ layerId, opacity }) => {
      const manager = getLayerManager();
      const result = manager.setLayerOpacity(layerId, opacity);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: result.success,
            message: result.message
          }, null, 2)
        }],
        isError: !result.success
      };
    }
  );

  // layer_blend_mode: 레이어 블렌드 모드 설정
  server.tool(
    'layer_blend_mode',
    '레이어의 블렌드 모드를 설정합니다.',
    {
      layerId: z.string().describe('레이어 ID'),
      blendMode: z.enum(BLEND_MODES as [string, ...string[]]).describe('블렌드 모드')
    },
    async ({ layerId, blendMode }) => {
      const manager = getLayerManager();
      const result = manager.setLayerBlendMode(layerId, blendMode as BlendMode);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: result.success,
            message: result.message
          }, null, 2)
        }],
        isError: !result.success
      };
    }
  );

  // layer_list: 레이어 목록 조회
  server.tool(
    'layer_list',
    '모든 레이어 목록을 조회합니다.',
    {},
    async () => {
      const manager = getLayerManager();
      const layers = manager.getLayers();
      const activeLayer = manager.getActiveLayer();

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            activeLayerId: activeLayer?.id,
            totalCount: layers.length,
            layers: layers.map((l, i) => ({
              index: i,
              id: l.id,
              name: l.name,
              visible: l.visible,
              locked: l.locked,
              opacity: l.opacity,
              blendMode: l.blendMode || 'normal',
              elementCount: l.elements.length,
              isActive: l.id === activeLayer?.id
            }))
          }, null, 2)
        }]
      };
    }
  );

  // layer_select: 활성 레이어 선택
  server.tool(
    'layer_select',
    '활성 레이어를 선택합니다.',
    {
      layerId: z.string().describe('선택할 레이어 ID')
    },
    async ({ layerId }) => {
      const manager = getLayerManager();
      const result = manager.setActiveLayer(layerId);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: result.success,
            message: result.message
          }, null, 2)
        }],
        isError: !result.success
      };
    }
  );

  // layer_merge: 레이어 병합
  server.tool(
    'layer_merge',
    '두 레이어를 병합합니다.',
    {
      sourceLayerId: z.string().describe('병합할 레이어 ID (삭제됨)'),
      targetLayerId: z.string().describe('대상 레이어 ID (유지됨)')
    },
    async ({ sourceLayerId, targetLayerId }) => {
      const manager = getLayerManager();
      const result = manager.mergeLayers(sourceLayerId, targetLayerId);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: result.success,
            message: result.message,
            remainingLayers: manager.getLayerCount()
          }, null, 2)
        }],
        isError: !result.success
      };
    }
  );

  // layer_duplicate: 레이어 복제
  server.tool(
    'layer_duplicate',
    '레이어를 복제합니다.',
    {
      layerId: z.string().describe('복제할 레이어 ID')
    },
    async ({ layerId }) => {
      const manager = getLayerManager();
      const result = manager.duplicateLayer(layerId);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: result.success,
            message: result.message,
            newLayerId: result.layerId,
            totalLayers: manager.getLayerCount()
          }, null, 2)
        }],
        isError: !result.success
      };
    }
  );
}
