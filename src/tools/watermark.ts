/**
 * Watermark Tools
 * 워터마크 오버레이 도구 - 텍스트/이미지 워터마크 지원
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getCurrentDocument } from '../core/document.js';
import { getHistoryManager } from '../core/history-manager.js';
import { createText, createRect } from '../core/element.js';

// 위치 타입
type Position = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'top-center' | 'bottom-center';

/**
 * 위치 계산 헬퍼
 */
function calculatePosition(
  position: Position,
  canvasWidth: number,
  canvasHeight: number,
  elementWidth: number,
  elementHeight: number,
  padding: number
): { x: number; y: number } {
  const positions: Record<Position, { x: number; y: number }> = {
    'top-left': { x: padding, y: padding },
    'top-right': { x: canvasWidth - elementWidth - padding, y: padding },
    'bottom-left': { x: padding, y: canvasHeight - elementHeight - padding },
    'bottom-right': { x: canvasWidth - elementWidth - padding, y: canvasHeight - elementHeight - padding },
    'center': { x: (canvasWidth - elementWidth) / 2, y: (canvasHeight - elementHeight) / 2 },
    'top-center': { x: (canvasWidth - elementWidth) / 2, y: padding },
    'bottom-center': { x: (canvasWidth - elementWidth) / 2, y: canvasHeight - elementHeight - padding }
  };

  return positions[position];
}

/**
 * Watermark Tools 등록
 */
export function registerWatermarkTools(server: McpServer): void {
  // watermark_text: 텍스트 워터마크 적용
  server.tool(
    'watermark_text',
    '텍스트 워터마크를 현재 캔버스에 적용합니다.',
    {
      text: z.string().describe('워터마크 텍스트'),
      position: z.enum(['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center', 'top-center', 'bottom-center'])
        .optional().default('bottom-right').describe('위치'),
      fontSize: z.number().optional().default(16).describe('폰트 크기'),
      fontFamily: z.string().optional().default('Arial, sans-serif').describe('폰트'),
      color: z.string().optional().default('#000000').describe('텍스트 색상'),
      opacity: z.number().min(0).max(1).optional().default(0.3).describe('불투명도 (0-1)'),
      rotation: z.number().optional().default(0).describe('회전 각도 (도)'),
      padding: z.number().optional().default(20).describe('여백'),
      backgroundColor: z.string().optional().describe('텍스트 배경색 (선택)'),
      repeat: z.boolean().optional().default(false).describe('타일형 반복 여부')
    },
    async ({ text, position, fontSize, fontFamily, color, opacity, rotation, padding, backgroundColor, repeat }) => {
      try {
        const doc = getCurrentDocument();
        const canvasWidth = doc.width;
        const canvasHeight = doc.height;

        // 워터마크 그룹 생성
        const groupId = 'watermark-text';

        if (repeat) {
          // 타일형 반복 워터마크
          const textWidth = text.length * fontSize * 0.6;
          const textHeight = fontSize * 1.5;
          const gapX = textWidth + 50;
          const gapY = textHeight + 40;

          // 패턴 정의
          doc.addDefs(`
            <pattern id="watermark-pattern" patternUnits="userSpaceOnUse"
                     width="${gapX}" height="${gapY}" patternTransform="rotate(${rotation - 30})">
              <text x="${gapX / 2}" y="${gapY / 2}"
                    font-size="${fontSize}" font-family="${fontFamily}"
                    fill="${color}" opacity="${opacity}"
                    text-anchor="middle" dominant-baseline="middle">${text}</text>
            </pattern>
          `);

          // 패턴 적용 사각형
          doc.addRawElement(`
            <rect x="0" y="0" width="${canvasWidth}" height="${canvasHeight}"
                  fill="url(#watermark-pattern)" id="${groupId}" />
          `);
        } else {
          // 단일 워터마크
          const estimatedWidth = text.length * fontSize * 0.6;
          const estimatedHeight = fontSize;
          const pos = calculatePosition(position, canvasWidth, canvasHeight, estimatedWidth, estimatedHeight, padding);

          // 텍스트 앵커 위치 조정
          let textX = pos.x + estimatedWidth / 2;
          let textY = pos.y + estimatedHeight;

          // 회전 변환
          const transform = rotation !== 0 ? `rotate(${rotation} ${textX} ${textY})` : '';

          // 배경 (선택적)
          if (backgroundColor) {
            doc.addRawElement(`
              <rect x="${pos.x - 5}" y="${pos.y}" width="${estimatedWidth + 10}" height="${estimatedHeight + 10}"
                    fill="${backgroundColor}" opacity="${Math.min(opacity + 0.2, 1)}" rx="3"
                    transform="${transform}" id="${groupId}-bg" />
            `);
          }

          // 텍스트
          doc.addRawElement(`
            <text x="${textX}" y="${textY}"
                  font-size="${fontSize}" font-family="${fontFamily}"
                  fill="${color}" opacity="${opacity}"
                  text-anchor="middle"
                  transform="${transform}" id="${groupId}">${text}</text>
          `);
        }

        getHistoryManager().record('watermark_text', `텍스트 워터마크 적용: ${text}`, doc.toJSON());

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: '텍스트 워터마크가 적용되었습니다.',
              watermark: {
                type: 'text',
                text,
                position: repeat ? 'repeat' : position,
                fontSize,
                opacity
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
              error: error instanceof Error ? error.message : '워터마크 적용에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );

  // watermark_image: 이미지 워터마크 적용
  server.tool(
    'watermark_image',
    '이미지 워터마크를 현재 캔버스에 적용합니다.',
    {
      imageUrl: z.string().describe('워터마크 이미지 URL 또는 data URI'),
      position: z.enum(['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center', 'top-center', 'bottom-center'])
        .optional().default('bottom-right').describe('위치'),
      scale: z.number().min(0.01).max(1).optional().default(0.2).describe('크기 (캔버스 대비 비율)'),
      opacity: z.number().min(0).max(1).optional().default(0.3).describe('불투명도 (0-1)'),
      padding: z.number().optional().default(20).describe('여백'),
      repeat: z.boolean().optional().default(false).describe('타일형 반복 여부'),
      repeatGap: z.number().optional().default(50).describe('반복 시 간격')
    },
    async ({ imageUrl, position, scale, opacity, padding, repeat, repeatGap }) => {
      try {
        const doc = getCurrentDocument();
        const canvasWidth = doc.width;
        const canvasHeight = doc.height;

        const imageWidth = canvasWidth * scale;
        const imageHeight = imageWidth; // 정사각형 가정

        const groupId = 'watermark-image';

        if (repeat) {
          // 타일형 반복
          const patternWidth = imageWidth + repeatGap;
          const patternHeight = imageHeight + repeatGap;

          doc.addDefs(`
            <pattern id="watermark-img-pattern" patternUnits="userSpaceOnUse"
                     width="${patternWidth}" height="${patternHeight}">
              <image href="${imageUrl}" x="${repeatGap / 2}" y="${repeatGap / 2}"
                     width="${imageWidth}" height="${imageHeight}"
                     opacity="${opacity}" preserveAspectRatio="xMidYMid meet" />
            </pattern>
          `);

          doc.addRawElement(`
            <rect x="0" y="0" width="${canvasWidth}" height="${canvasHeight}"
                  fill="url(#watermark-img-pattern)" id="${groupId}" />
          `);
        } else {
          // 단일 이미지
          const pos = calculatePosition(position, canvasWidth, canvasHeight, imageWidth, imageHeight, padding);

          doc.addRawElement(`
            <image href="${imageUrl}" x="${pos.x}" y="${pos.y}"
                   width="${imageWidth}" height="${imageHeight}"
                   opacity="${opacity}" preserveAspectRatio="xMidYMid meet" id="${groupId}" />
          `);
        }

        getHistoryManager().record('watermark_image', '이미지 워터마크 적용', doc.toJSON());

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: '이미지 워터마크가 적용되었습니다.',
              watermark: {
                type: 'image',
                position: repeat ? 'repeat' : position,
                scale,
                opacity,
                size: { width: imageWidth, height: imageHeight }
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
              error: error instanceof Error ? error.message : '워터마크 적용에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );

  // watermark_copyright: 저작권 워터마크 (빠른 적용)
  server.tool(
    'watermark_copyright',
    '저작권 워터마크를 빠르게 적용합니다.',
    {
      author: z.string().describe('저작자명'),
      year: z.number().optional().describe('저작년도 (기본: 현재 연도)'),
      style: z.enum(['simple', 'badge', 'stamp']).optional().default('simple')
        .describe('스타일 (simple: 단순 텍스트, badge: 배지형, stamp: 스탬프형)'),
      position: z.enum(['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'])
        .optional().default('bottom-right').describe('위치'),
      opacity: z.number().min(0).max(1).optional().default(0.5).describe('불투명도'),
      color: z.string().optional().default('#333333').describe('색상')
    },
    async ({ author, year, style, position, opacity, color }) => {
      try {
        const doc = getCurrentDocument();
        const canvasWidth = doc.width;
        const canvasHeight = doc.height;

        const currentYear = year || new Date().getFullYear();
        const copyrightText = `© ${currentYear} ${author}`;

        const groupId = 'watermark-copyright';
        const padding = 15;
        const fontSize = style === 'stamp' ? 20 : 14;
        const textWidth = copyrightText.length * fontSize * 0.5;
        const textHeight = fontSize * 1.5;

        const pos = calculatePosition(position, canvasWidth, canvasHeight, textWidth + 20, textHeight + 10, padding);

        switch (style) {
          case 'badge':
            // 배지 스타일
            doc.addRawElement(`
              <g id="${groupId}" opacity="${opacity}">
                <rect x="${pos.x}" y="${pos.y}" width="${textWidth + 20}" height="${textHeight + 10}"
                      fill="${color}" rx="15" />
                <text x="${pos.x + textWidth / 2 + 10}" y="${pos.y + textHeight}"
                      font-size="${fontSize}" font-family="Arial, sans-serif"
                      fill="#ffffff" text-anchor="middle">${copyrightText}</text>
              </g>
            `);
            break;

          case 'stamp':
            // 스탬프 스타일
            const stampRadius = Math.max(textWidth, textHeight) * 0.7;
            const stampX = pos.x + stampRadius;
            const stampY = pos.y + stampRadius;

            doc.addRawElement(`
              <g id="${groupId}" opacity="${opacity}" transform="rotate(-15 ${stampX} ${stampY})">
                <circle cx="${stampX}" cy="${stampY}" r="${stampRadius}"
                        fill="none" stroke="${color}" stroke-width="3" />
                <circle cx="${stampX}" cy="${stampY}" r="${stampRadius * 0.85}"
                        fill="none" stroke="${color}" stroke-width="1" />
                <text x="${stampX}" y="${stampY + 5}"
                      font-size="${fontSize}" font-family="Arial, sans-serif" font-weight="bold"
                      fill="${color}" text-anchor="middle">${copyrightText}</text>
              </g>
            `);
            break;

          default:
            // 단순 텍스트
            doc.addRawElement(`
              <text x="${pos.x}" y="${pos.y + textHeight}"
                    font-size="${fontSize}" font-family="Arial, sans-serif"
                    fill="${color}" opacity="${opacity}" id="${groupId}">${copyrightText}</text>
            `);
        }

        getHistoryManager().record('watermark_copyright', `저작권 워터마크: ${copyrightText}`, doc.toJSON());

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: '저작권 워터마크가 적용되었습니다.',
              watermark: {
                type: 'copyright',
                text: copyrightText,
                style,
                position,
                opacity
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
              error: error instanceof Error ? error.message : '워터마크 적용에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );

  // watermark_remove: 워터마크 제거
  server.tool(
    'watermark_remove',
    '워터마크를 제거합니다.',
    {
      type: z.enum(['all', 'text', 'image', 'copyright']).optional().default('all')
        .describe('제거할 워터마크 유형')
    },
    async ({ type }) => {
      try {
        const doc = getCurrentDocument();

        const idsToRemove: string[] = [];

        if (type === 'all' || type === 'text') {
          idsToRemove.push('watermark-text', 'watermark-text-bg');
        }
        if (type === 'all' || type === 'image') {
          idsToRemove.push('watermark-image');
        }
        if (type === 'all' || type === 'copyright') {
          idsToRemove.push('watermark-copyright');
        }

        let removedCount = 0;
        for (const id of idsToRemove) {
          if (doc.removeElement(id)) {
            removedCount++;
          }
        }

        // 패턴 정의도 제거
        doc.removeDefs('watermark-pattern');
        doc.removeDefs('watermark-img-pattern');

        getHistoryManager().record('watermark_remove', `워터마크 제거: ${type}`, doc.toJSON());

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: removedCount > 0
                ? `${removedCount}개의 워터마크가 제거되었습니다.`
                : '제거할 워터마크가 없습니다.',
              removed: removedCount
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : '워터마크 제거에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );

  // watermark_diagonal: 대각선 텍스트 워터마크
  server.tool(
    'watermark_diagonal',
    '대각선 텍스트 워터마크를 적용합니다.',
    {
      text: z.string().describe('워터마크 텍스트'),
      fontSize: z.number().optional().default(48).describe('폰트 크기'),
      color: z.string().optional().default('#000000').describe('색상'),
      opacity: z.number().min(0).max(1).optional().default(0.1).describe('불투명도'),
      angle: z.number().optional().default(-30).describe('각도 (도)')
    },
    async ({ text, fontSize, color, opacity, angle }) => {
      try {
        const doc = getCurrentDocument();
        const canvasWidth = doc.width;
        const canvasHeight = doc.height;

        // 대각선 길이
        const diagonal = Math.sqrt(canvasWidth * canvasWidth + canvasHeight * canvasHeight);
        const textWidth = text.length * fontSize * 0.6;
        const repeatCount = Math.ceil(diagonal / textWidth) + 1;

        // 반복 텍스트 생성
        const repeatedText = Array(repeatCount).fill(text).join('   ');

        // 중앙에서 회전
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;

        // 여러 줄로 반복
        const lineHeight = fontSize * 2;
        const lineCount = Math.ceil(diagonal / lineHeight);

        doc.addRawElement(`<g id="watermark-diagonal" opacity="${opacity}">`);

        for (let i = -lineCount; i <= lineCount; i++) {
          const y = centerY + i * lineHeight;
          doc.addRawElement(`
            <text x="${centerX}" y="${y}"
                  font-size="${fontSize}" font-family="Arial, sans-serif"
                  fill="${color}" text-anchor="middle"
                  transform="rotate(${angle} ${centerX} ${y})">${repeatedText}</text>
          `);
        }

        doc.addRawElement(`</g>`);

        getHistoryManager().record('watermark_diagonal', `대각선 워터마크: ${text}`, doc.toJSON());

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: '대각선 워터마크가 적용되었습니다.',
              watermark: { type: 'diagonal', text, angle, opacity }
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : '워터마크 적용에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );
}
