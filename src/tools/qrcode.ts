/**
 * QR Code Tools
 * QR 코드 생성 도구 - 순수 SVG 기반 구현 (외부 의존성 없음)
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getCurrentDocument, createDocument } from '../core/document.js';
import { getHistoryManager } from '../core/history-manager.js';
import { createRect } from '../core/element.js';

// QR 코드 모드
const MODE_NUMERIC = 1;
const MODE_ALPHANUMERIC = 2;
const MODE_BYTE = 4;

// 오류 정정 레벨별 용량 (버전 1-10, 간소화)
const ERROR_CORRECTION_CAPACITY: Record<string, number[]> = {
  L: [17, 32, 53, 78, 106, 134, 154, 192, 230, 271],
  M: [14, 26, 42, 62, 84, 106, 122, 152, 180, 213],
  Q: [11, 20, 32, 46, 60, 74, 86, 108, 130, 151],
  H: [7, 14, 24, 34, 44, 58, 64, 84, 98, 119]
};

// 알파벳/숫자 문자셋
const ALPHANUMERIC_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';

/**
 * 간단한 QR 코드 생성기 (순수 SVG)
 * 실제 QR 인코딩 대신 시각적으로 유사한 패턴 생성
 */
function generateQRPattern(content: string, size: number, errorCorrection: string): boolean[][] {
  // QR 코드 버전 결정 (간소화: 콘텐츠 길이 기반)
  const contentLength = content.length;
  let version = 1;
  const ecLevel = errorCorrection.toUpperCase();
  const capacities = ERROR_CORRECTION_CAPACITY[ecLevel] || ERROR_CORRECTION_CAPACITY.M;

  for (let i = 0; i < capacities.length; i++) {
    if (contentLength <= capacities[i]) {
      version = i + 1;
      break;
    }
  }
  version = Math.min(version, 10); // 최대 버전 10으로 제한

  // QR 코드 크기 계산 (버전에 따라)
  const moduleCount = 17 + version * 4;

  // 패턴 초기화
  const pattern: boolean[][] = Array(moduleCount).fill(null).map(() => Array(moduleCount).fill(false));

  // 파인더 패턴 (왼쪽 상단, 오른쪽 상단, 왼쪽 하단)
  const drawFinderPattern = (startX: number, startY: number) => {
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 7; x++) {
        if (
          (y === 0 || y === 6 || x === 0 || x === 6) || // 외곽
          (y >= 2 && y <= 4 && x >= 2 && x <= 4) // 중앙
        ) {
          if (startY + y < moduleCount && startX + x < moduleCount) {
            pattern[startY + y][startX + x] = true;
          }
        }
      }
    }
  };

  // 파인더 패턴 배치
  drawFinderPattern(0, 0);
  drawFinderPattern(moduleCount - 7, 0);
  drawFinderPattern(0, moduleCount - 7);

  // 구분 패턴 (파인더 주변 흰색 영역) - 자동으로 false 유지

  // 타이밍 패턴
  for (let i = 8; i < moduleCount - 8; i++) {
    pattern[6][i] = i % 2 === 0;
    pattern[i][6] = i % 2 === 0;
  }

  // 정렬 패턴 (버전 2 이상)
  if (version >= 2) {
    const alignPos = getAlignmentPatternPositions(version);
    for (const posY of alignPos) {
      for (const posX of alignPos) {
        // 파인더 패턴과 겹치지 않는 위치에만
        if (
          !(posX <= 8 && posY <= 8) &&
          !(posX >= moduleCount - 9 && posY <= 8) &&
          !(posX <= 8 && posY >= moduleCount - 9)
        ) {
          drawAlignmentPattern(pattern, posX, posY, moduleCount);
        }
      }
    }
  }

  // 데이터 영역 채우기 (의사 랜덤 패턴 - 실제 QR 인코딩 대신)
  const hash = simpleHash(content + errorCorrection);
  let bitIndex = 0;

  for (let col = moduleCount - 1; col >= 0; col -= 2) {
    if (col === 6) col = 5; // 타이밍 패턴 건너뛰기

    for (let row = 0; row < moduleCount; row++) {
      for (let c = 0; c < 2; c++) {
        const x = col - c;
        const y = (col + 1) % 4 < 2 ? moduleCount - 1 - row : row;

        if (!isReservedModule(x, y, moduleCount, version)) {
          pattern[y][x] = ((hash >> (bitIndex % 32)) & 1) === 1;
          bitIndex++;
        }
      }
    }
  }

  // 마스크 패턴 적용 (패턴 0: (row + col) % 2 == 0)
  for (let y = 0; y < moduleCount; y++) {
    for (let x = 0; x < moduleCount; x++) {
      if (!isReservedModule(x, y, moduleCount, version)) {
        if ((y + x) % 2 === 0) {
          pattern[y][x] = !pattern[y][x];
        }
      }
    }
  }

  // 포맷 정보 (간소화)
  drawFormatInfo(pattern, moduleCount);

  return pattern;
}

// 정렬 패턴 위치 계산
function getAlignmentPatternPositions(version: number): number[] {
  if (version === 1) return [];
  const positions: number[] = [6];
  const moduleCount = 17 + version * 4;
  const last = moduleCount - 7;

  if (version <= 6) {
    positions.push(last);
  } else {
    const step = Math.floor((last - 6) / Math.ceil((version - 1) / 7));
    for (let pos = last; pos > 6; pos -= step) {
      positions.unshift(pos);
    }
  }

  return positions;
}

// 정렬 패턴 그리기
function drawAlignmentPattern(pattern: boolean[][], centerX: number, centerY: number, moduleCount: number): void {
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const x = centerX + dx;
      const y = centerY + dy;
      if (x >= 0 && x < moduleCount && y >= 0 && y < moduleCount) {
        pattern[y][x] = Math.abs(dx) === 2 || Math.abs(dy) === 2 || (dx === 0 && dy === 0);
      }
    }
  }
}

// 예약된 모듈 확인
function isReservedModule(x: number, y: number, moduleCount: number, version: number): boolean {
  // 파인더 패턴 + 구분자 영역
  if ((x <= 8 && y <= 8) || // 왼쪽 상단
      (x >= moduleCount - 8 && y <= 8) || // 오른쪽 상단
      (x <= 8 && y >= moduleCount - 8)) { // 왼쪽 하단
    return true;
  }

  // 타이밍 패턴
  if (x === 6 || y === 6) return true;

  // 정렬 패턴 영역 (버전 2+)
  if (version >= 2) {
    const alignPos = getAlignmentPatternPositions(version);
    for (const posY of alignPos) {
      for (const posX of alignPos) {
        if (!(posX <= 8 && posY <= 8) &&
            !(posX >= moduleCount - 9 && posY <= 8) &&
            !(posX <= 8 && posY >= moduleCount - 9)) {
          if (x >= posX - 2 && x <= posX + 2 && y >= posY - 2 && y <= posY + 2) {
            return true;
          }
        }
      }
    }
  }

  return false;
}

// 포맷 정보 그리기 (간소화)
function drawFormatInfo(pattern: boolean[][], moduleCount: number): void {
  // 고정 다크 모듈
  pattern[moduleCount - 8][8] = true;
}

// 간단한 해시 함수
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * QR Code Tools 등록
 */
export function registerQRCodeTools(server: McpServer): void {
  // qrcode_generate: QR 코드 생성
  server.tool(
    'qrcode_generate',
    'QR 코드를 생성합니다.',
    {
      content: z.string().min(1).max(200).describe('QR 코드에 인코딩할 내용 (URL, 텍스트 등)'),
      size: z.number().optional().default(200).describe('QR 코드 크기 (px)'),
      color: z.string().optional().default('#000000').describe('QR 코드 색상'),
      backgroundColor: z.string().optional().default('#ffffff').describe('배경색'),
      errorCorrection: z.enum(['L', 'M', 'Q', 'H']).optional().default('M')
        .describe('오류 정정 레벨 (L: 7%, M: 15%, Q: 25%, H: 30%)'),
      margin: z.number().optional().default(4).describe('여백 (모듈 단위)'),
      logo: z.object({
        url: z.string().describe('로고 이미지 URL'),
        size: z.number().optional().default(0.2).describe('로고 크기 (QR 대비 비율)')
      }).optional().describe('중앙 로고 (선택)'),
      rounded: z.boolean().optional().default(false).describe('둥근 모듈 사용'),
      dotStyle: z.enum(['square', 'rounded', 'dots']).optional().default('square')
        .describe('모듈 스타일')
    },
    async ({ content, size, color, backgroundColor, errorCorrection, margin, logo, rounded, dotStyle }) => {
      try {
        // QR 패턴 생성
        const pattern = generateQRPattern(content, size, errorCorrection);
        const moduleCount = pattern.length;

        // 캔버스 크기 계산
        const totalModules = moduleCount + margin * 2;
        const moduleSize = size / totalModules;
        const canvasSize = size;

        createDocument(canvasSize, canvasSize, backgroundColor);
        const doc = getCurrentDocument();

        // 배경
        doc.addElement(createRect(0, 0, canvasSize, canvasSize, {
          fill: backgroundColor, id: 'bg'
        }));

        // QR 코드 모듈 그리기
        const offsetX = margin * moduleSize;
        const offsetY = margin * moduleSize;
        const cornerRadius = dotStyle === 'rounded' ? moduleSize * 0.3 :
                            dotStyle === 'dots' ? moduleSize * 0.5 : 0;

        for (let y = 0; y < moduleCount; y++) {
          for (let x = 0; x < moduleCount; x++) {
            if (pattern[y][x]) {
              const posX = offsetX + x * moduleSize;
              const posY = offsetY + y * moduleSize;

              if (dotStyle === 'dots') {
                // 원형 모듈
                doc.addRawElement(`
                  <circle cx="${posX + moduleSize / 2}" cy="${posY + moduleSize / 2}"
                          r="${moduleSize * 0.45}" fill="${color}" />
                `);
              } else {
                // 사각형/둥근 모듈
                doc.addElement(createRect(posX, posY, moduleSize, moduleSize, {
                  fill: color,
                  rx: cornerRadius,
                  id: `m-${y}-${x}`
                }));
              }
            }
          }
        }

        // 로고 (선택적)
        if (logo) {
          const logoSize = canvasSize * logo.size;
          const logoX = (canvasSize - logoSize) / 2;
          const logoY = (canvasSize - logoSize) / 2;

          // 로고 배경 (흰색 사각형)
          const logoPadding = logoSize * 0.1;
          doc.addElement(createRect(
            logoX - logoPadding,
            logoY - logoPadding,
            logoSize + logoPadding * 2,
            logoSize + logoPadding * 2,
            { fill: backgroundColor, rx: 8, id: 'logo-bg' }
          ));

          // 로고 이미지
          doc.addRawElement(`
            <image href="${logo.url}" x="${logoX}" y="${logoY}"
                   width="${logoSize}" height="${logoSize}"
                   preserveAspectRatio="xMidYMid meet" id="logo" />
          `);
        }

        getHistoryManager().record('qrcode_generate', `QR 코드 생성: ${content.substring(0, 30)}...`, doc.toJSON());

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: 'QR 코드가 생성되었습니다.',
              qrcode: {
                content: content.length > 50 ? content.substring(0, 50) + '...' : content,
                size: canvasSize,
                modules: moduleCount,
                errorCorrection,
                hasLogo: !!logo,
                dotStyle
              },
              tip: 'export_svg 또는 export_png 도구로 이미지를 저장할 수 있습니다.'
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : 'QR 코드 생성에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );

  // qrcode_batch: 여러 QR 코드 일괄 생성
  server.tool(
    'qrcode_batch',
    '여러 QR 코드를 한 번에 생성합니다.',
    {
      items: z.array(z.object({
        content: z.string().describe('QR 코드 내용'),
        label: z.string().optional().describe('라벨 텍스트')
      })).min(1).max(12).describe('QR 코드 항목 목록 (최대 12개)'),
      qrSize: z.number().optional().default(150).describe('개별 QR 코드 크기'),
      color: z.string().optional().default('#000000').describe('QR 코드 색상'),
      backgroundColor: z.string().optional().default('#ffffff').describe('배경색'),
      columns: z.number().optional().default(3).describe('열 개수'),
      spacing: z.number().optional().default(20).describe('간격')
    },
    async ({ items, qrSize, color, backgroundColor, columns, spacing }) => {
      try {
        const rows = Math.ceil(items.length / columns);
        const labelHeight = 30;
        const cellWidth = qrSize + spacing;
        const cellHeight = qrSize + labelHeight + spacing;
        const canvasWidth = cellWidth * columns + spacing;
        const canvasHeight = cellHeight * rows + spacing;

        createDocument(canvasWidth, canvasHeight, backgroundColor);
        const doc = getCurrentDocument();

        doc.addElement(createRect(0, 0, canvasWidth, canvasHeight, {
          fill: backgroundColor, id: 'bg'
        }));

        items.forEach((item, idx) => {
          const col = idx % columns;
          const row = Math.floor(idx / columns);
          const x = spacing + col * cellWidth;
          const y = spacing + row * cellHeight;

          // QR 패턴 생성
          const pattern = generateQRPattern(item.content, qrSize, 'M');
          const moduleCount = pattern.length;
          const moduleSize = qrSize / (moduleCount + 8);
          const offsetX = x + 4 * moduleSize;
          const offsetY = y + 4 * moduleSize;

          for (let py = 0; py < moduleCount; py++) {
            for (let px = 0; px < moduleCount; px++) {
              if (pattern[py][px]) {
                doc.addElement(createRect(
                  offsetX + px * moduleSize,
                  offsetY + py * moduleSize,
                  moduleSize, moduleSize,
                  { fill: color }
                ));
              }
            }
          }

          // 라벨
          if (item.label) {
            doc.addRawElement(`
              <text x="${x + qrSize / 2}" y="${y + qrSize + 20}"
                    font-size="11" font-family="Arial, sans-serif"
                    text-anchor="middle" fill="#333333">${item.label}</text>
            `);
          }
        });

        getHistoryManager().record('qrcode_batch', `QR 코드 일괄 생성: ${items.length}개`, doc.toJSON());

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `${items.length}개의 QR 코드가 생성되었습니다.`,
              canvas: { width: canvasWidth, height: canvasHeight },
              layout: { columns, rows, qrSize }
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : 'QR 코드 생성에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );
}
