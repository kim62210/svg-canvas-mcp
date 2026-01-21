/**
 * Animation Tools
 * CSS 및 SMIL 애니메이션 지원
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getCurrentDocument } from '../core/document.js';
import { getHistoryManager } from '../core/history-manager.js';
import { generateId } from '../core/id-generator.js';

// 애니메이션 저장소 (문서별로 관리)
const animationStore: Map<string, { css: Map<string, string>; smil: Map<string, string> }> = new Map();

function getAnimations() {
  if (!animationStore.has('current')) {
    animationStore.set('current', { css: new Map(), smil: new Map() });
  }
  return animationStore.get('current')!;
}

/**
 * Animation Tools 등록
 */
export function registerAnimationTools(server: McpServer): void {
  // anim_css_add: CSS 애니메이션 추가
  server.tool(
    'anim_css_add',
    '객체에 CSS 애니메이션을 추가합니다.',
    {
      objectId: z.string().describe('객체 ID'),
      keyframes: z.array(z.object({
        offset: z.number().min(0).max(100).describe('키프레임 위치 (0-100%)'),
        properties: z.record(z.union([z.string(), z.number()])).describe('CSS 속성들')
      })).min(2).describe('키프레임 배열'),
      duration: z.string().describe('지속 시간 (예: "1s", "500ms")'),
      timingFunction: z.enum(['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out']).optional().default('ease').describe('타이밍 함수'),
      delay: z.string().optional().describe('지연 시간'),
      iterationCount: z.union([z.number(), z.literal('infinite')]).optional().default(1).describe('반복 횟수'),
      direction: z.enum(['normal', 'reverse', 'alternate', 'alternate-reverse']).optional().default('normal').describe('방향'),
      fillMode: z.enum(['none', 'forwards', 'backwards', 'both']).optional().default('forwards').describe('종료 후 상태')
    },
    async ({ objectId, keyframes, duration, timingFunction, delay, iterationCount, direction, fillMode }) => {
      try {
        const doc = getCurrentDocument();
        const element = doc.getElementById(objectId);

        if (!element) {
          throw new Error(`객체를 찾을 수 없습니다: ${objectId}`);
        }

        const animName = `anim-${objectId}-${Date.now()}`;
        const animations = getAnimations();

        // 키프레임 CSS 생성
        const keyframesCss = keyframes.map(kf => {
          const props = Object.entries(kf.properties)
            .map(([k, v]) => `${k}: ${v}`)
            .join('; ');
          return `${kf.offset}% { ${props} }`;
        }).join('\n  ');

        const css = `@keyframes ${animName} {\n  ${keyframesCss}\n}`;
        animations.css.set(animName, css);

        // 객체에 애니메이션 적용
        const animValue = [
          animName,
          duration,
          timingFunction,
          delay || '0s',
          iterationCount,
          direction,
          fillMode
        ].join(' ');

        const currentStyle = element.style || '';
        const newStyle = currentStyle
          ? `${currentStyle}; animation: ${animValue}`
          : `animation: ${animValue}`;

        doc.updateElement(objectId, { style: newStyle });

        getHistoryManager().record(
          'anim_css_add',
          `CSS 애니메이션 추가: ${objectId}`,
          doc.toJSON()
        );

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: 'CSS 애니메이션이 추가되었습니다.',
              objectId,
              animationName: animName,
              duration,
              keyframeCount: keyframes.length,
              css
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : '애니메이션 추가에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );

  // anim_smil_add: SMIL 애니메이션 추가
  server.tool(
    'anim_smil_add',
    '객체에 SMIL 애니메이션을 추가합니다. (SVG 내장 애니메이션)',
    {
      objectId: z.string().describe('객체 ID'),
      attributeName: z.string().describe('애니메이션할 속성 (예: "opacity", "cx", "transform")'),
      from: z.string().optional().describe('시작 값'),
      to: z.string().optional().describe('끝 값'),
      values: z.array(z.string()).optional().describe('값 시퀀스 (from/to 대신 사용)'),
      dur: z.string().describe('지속 시간 (예: "2s")'),
      begin: z.string().optional().default('0s').describe('시작 시점'),
      repeatCount: z.union([z.number(), z.literal('indefinite')]).optional().default(1).describe('반복 횟수'),
      fill: z.enum(['freeze', 'remove']).optional().default('freeze').describe('종료 후 상태'),
      calcMode: z.enum(['discrete', 'linear', 'paced', 'spline']).optional().describe('계산 모드'),
      type: z.enum(['animate', 'animateTransform', 'animateMotion', 'set']).optional().default('animate').describe('애니메이션 타입'),
      transformType: z.enum(['translate', 'scale', 'rotate', 'skewX', 'skewY']).optional().describe('변환 타입 (animateTransform용)')
    },
    async ({ objectId, attributeName, from, to, values, dur, begin, repeatCount, fill, calcMode, type, transformType }) => {
      try {
        const doc = getCurrentDocument();
        const element = doc.getElementById(objectId);

        if (!element) {
          throw new Error(`객체를 찾을 수 없습니다: ${objectId}`);
        }

        const animId = generateId('anim');
        const animations = getAnimations();

        // SMIL 요소 생성
        let smilElement: string;

        if (type === 'animateTransform') {
          smilElement = `<animateTransform id="${animId}" attributeName="${attributeName}" type="${transformType || 'translate'}" from="${from || ''}" to="${to || ''}" dur="${dur}" begin="${begin}" repeatCount="${repeatCount}" fill="${fill}"${calcMode ? ` calcMode="${calcMode}"` : ''}/>`;
        } else if (type === 'animateMotion') {
          smilElement = `<animateMotion id="${animId}" dur="${dur}" begin="${begin}" repeatCount="${repeatCount}" fill="${fill}">${values ? `<mpath href="#${values[0]}"/>` : ''}</animateMotion>`;
        } else if (type === 'set') {
          smilElement = `<set id="${animId}" attributeName="${attributeName}" to="${to || ''}" begin="${begin}"/>`;
        } else {
          const valueAttr = values ? `values="${values.join(';')}"` : `from="${from || ''}" to="${to || ''}"`;
          smilElement = `<animate id="${animId}" attributeName="${attributeName}" ${valueAttr} dur="${dur}" begin="${begin}" repeatCount="${repeatCount}" fill="${fill}"${calcMode ? ` calcMode="${calcMode}"` : ''}/>`;
        }

        animations.smil.set(animId, smilElement);

        getHistoryManager().record(
          'anim_smil_add',
          `SMIL 애니메이션 추가: ${objectId}.${attributeName}`,
          doc.toJSON()
        );

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: 'SMIL 애니메이션이 추가되었습니다.',
              objectId,
              animId,
              attributeName,
              type,
              duration: dur,
              smilElement,
              note: 'SMIL 요소는 SVG 내보내기 시 자동으로 포함됩니다.'
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : '애니메이션 추가에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );

  // anim_remove: 애니메이션 제거
  server.tool(
    'anim_remove',
    '객체의 애니메이션을 제거합니다.',
    {
      objectId: z.string().describe('객체 ID'),
      animId: z.string().optional().describe('특정 애니메이션 ID (없으면 모든 애니메이션 제거)')
    },
    async ({ objectId, animId }) => {
      try {
        const doc = getCurrentDocument();
        const element = doc.getElementById(objectId);

        if (!element) {
          throw new Error(`객체를 찾을 수 없습니다: ${objectId}`);
        }

        const animations = getAnimations();

        if (animId) {
          animations.css.delete(animId);
          animations.smil.delete(animId);
        } else {
          // 객체의 모든 애니메이션 제거
          const prefix = `anim-${objectId}`;
          for (const key of animations.css.keys()) {
            if (key.startsWith(prefix)) {
              animations.css.delete(key);
            }
          }
        }

        // CSS animation 스타일 제거
        if (element.style) {
          const newStyle = element.style
            .split(';')
            .filter(s => !s.trim().startsWith('animation'))
            .join(';')
            .trim();
          doc.updateElement(objectId, { style: newStyle || undefined });
        }

        getHistoryManager().record(
          'anim_remove',
          `애니메이션 제거: ${objectId}`,
          doc.toJSON()
        );

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: '애니메이션이 제거되었습니다.',
              objectId,
              removedAnimId: animId || 'all'
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : '애니메이션 제거에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );

  // anim_list: 애니메이션 목록 조회
  server.tool(
    'anim_list',
    '정의된 애니메이션 목록을 조회합니다.',
    {
      objectId: z.string().optional().describe('특정 객체의 애니메이션만 조회')
    },
    async ({ objectId }) => {
      try {
        const animations = getAnimations();

        let cssAnims = Array.from(animations.css.entries());
        let smilAnims = Array.from(animations.smil.entries());

        if (objectId) {
          const prefix = `anim-${objectId}`;
          cssAnims = cssAnims.filter(([key]) => key.startsWith(prefix));
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              cssAnimations: cssAnims.map(([id, css]) => ({ id, css })),
              smilAnimations: smilAnims.map(([id, smil]) => ({ id, smil })),
              totalCount: cssAnims.length + smilAnims.length
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
}
