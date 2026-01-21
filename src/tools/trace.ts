/**
 * Trace Tools
 * 이미지를 벡터 패스로 변환하는 이미지 트레이싱 도구
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getCurrentDocument, createDocument } from '../core/document.js';
import { getHistoryManager } from '../core/history-manager.js';
import * as potrace from 'potrace';
import * as fs from 'fs';
import * as path from 'path';

// potrace 파라미터 타입
interface PotraceParams {
  threshold?: number;
  turnPolicy?: string;
  turdSize?: number;
  optCurve?: boolean;
  optTolerance?: number;
  color?: string;
  background?: string;
}

/**
 * 이미지를 SVG 패스로 트레이싱 (Promise 래퍼)
 */
function traceImage(imagePath: string, params: PotraceParams): Promise<string> {
  return new Promise((resolve, reject) => {
    potrace.trace(imagePath, params, (err: Error | null, svg: string) => {
      if (err) {
        reject(err);
      } else {
        resolve(svg);
      }
    });
  });
}

/**
 * 포스터라이즈 트레이싱 (컬러) Promise 래퍼
 */
function posterizeImage(imagePath: string, params: PotraceParams & { steps?: number }): Promise<string> {
  return new Promise((resolve, reject) => {
    potrace.posterize(imagePath, params, (err: Error | null, svg: string) => {
      if (err) {
        reject(err);
      } else {
        resolve(svg);
      }
    });
  });
}

/**
 * SVG 문자열에서 path 요소들 추출
 */
function extractPathsFromSVG(svg: string): { paths: string[]; viewBox: string | null } {
  const paths: string[] = [];
  const pathRegex = /<path[^>]*d="([^"]+)"[^>]*>/g;
  let match;

  while ((match = pathRegex.exec(svg)) !== null) {
    paths.push(match[1]);
  }

  // viewBox 추출
  const viewBoxMatch = svg.match(/viewBox="([^"]+)"/);
  const viewBox = viewBoxMatch ? viewBoxMatch[1] : null;

  return { paths, viewBox };
}

/**
 * Trace Tools 등록
 */
export function registerTraceTools(server: McpServer): void {

  // trace_image: 이미지를 벡터로 변환 (흑백)
  server.tool(
    'trace_image',
    '이미지 파일을 벡터 SVG 패스로 변환합니다 (흑백 트레이싱).',
    {
      imagePath: z.string().describe('이미지 파일 경로 (PNG, JPG, BMP 등)'),
      threshold: z.number().min(0).max(255).optional().default(128)
        .describe('흑백 변환 임계값 (0-255, 기본: 128)'),
      turnPolicy: z.enum(['black', 'white', 'left', 'right', 'minority', 'majority']).optional().default('minority')
        .describe('곡선 방향 정책'),
      turdSize: z.number().min(0).optional().default(2)
        .describe('무시할 최소 영역 크기 (기본: 2)'),
      smoothing: z.boolean().optional().default(true)
        .describe('곡선 최적화 여부'),
      tolerance: z.number().min(0).max(1).optional().default(0.2)
        .describe('곡선 최적화 허용 오차 (0-1)'),
      color: z.string().optional().default('#000000')
        .describe('트레이싱 결과 색상'),
      addToCanvas: z.boolean().optional().default(true)
        .describe('현재 캔버스에 추가할지 여부')
    },
    async ({ imagePath, threshold, turnPolicy, turdSize, smoothing, tolerance, color, addToCanvas }) => {
      try {
        // 파일 존재 확인
        if (!fs.existsSync(imagePath)) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: `파일을 찾을 수 없습니다: ${imagePath}`
              }, null, 2)
            }]
          };
        }

        // potrace 옵션
        const params: PotraceParams = {
          threshold,
          turnPolicy,
          turdSize,
          optCurve: smoothing,
          optTolerance: tolerance,
          color,
          background: 'transparent'
        };

        // 트레이싱 실행
        const svg = await traceImage(imagePath, params);

        // 패스 추출
        const { paths, viewBox } = extractPathsFromSVG(svg);

        if (paths.length === 0) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: '트레이싱 결과 패스가 없습니다. 이미지가 비어있거나 임계값을 조정해보세요.'
              }, null, 2)
            }]
          };
        }

        // 캔버스에 추가
        if (addToCanvas) {
          const doc = getCurrentDocument();

          // viewBox에서 크기 추출
          if (viewBox) {
            const [, , w, h] = viewBox.split(' ').map(Number);
            if (doc.getCanvasInfo().elementCount === 0) {
              // 빈 캔버스면 이미지 크기로 설정
              createDocument(w, h, 'transparent');
            }
          }

          // 패스들을 캔버스에 추가
          paths.forEach((d, index) => {
            doc.addRawElement(`<path d="${d}" fill="${color}" id="traced-path-${index + 1}" />`);
          });

          getHistoryManager().record(
            'trace_image',
            `이미지 트레이싱: ${path.basename(imagePath)}`,
            doc.toJSON()
          );
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `이미지가 벡터로 변환되었습니다.`,
              source: path.basename(imagePath),
              pathCount: paths.length,
              viewBox,
              addedToCanvas: addToCanvas,
              svgCode: svg
            }, null, 2)
          }]
        };

      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error)
            }, null, 2)
          }]
        };
      }
    }
  );

  // trace_color: 컬러 이미지 트레이싱 (포스터라이즈)
  server.tool(
    'trace_color',
    '컬러 이미지를 다색 벡터 SVG로 변환합니다 (포스터라이즈).',
    {
      imagePath: z.string().describe('이미지 파일 경로'),
      colors: z.number().min(2).max(16).optional().default(4)
        .describe('색상 수 (2-16, 기본: 4)'),
      smoothing: z.boolean().optional().default(true)
        .describe('곡선 최적화 여부'),
      addToCanvas: z.boolean().optional().default(true)
        .describe('현재 캔버스에 추가할지 여부')
    },
    async ({ imagePath, colors, smoothing, addToCanvas }) => {
      try {
        if (!fs.existsSync(imagePath)) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: `파일을 찾을 수 없습니다: ${imagePath}`
              }, null, 2)
            }]
          };
        }

        const params = {
          steps: colors,
          optCurve: smoothing,
          background: 'transparent'
        };

        const svg = await posterizeImage(imagePath, params);

        // viewBox 추출
        const viewBoxMatch = svg.match(/viewBox="([^"]+)"/);
        const viewBox = viewBoxMatch ? viewBoxMatch[1] : null;

        // 전체 내용 추출 (svg 태그 내부)
        const contentMatch = svg.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
        const innerContent = contentMatch ? contentMatch[1].trim() : '';

        if (addToCanvas) {
          const doc = getCurrentDocument();

          if (viewBox) {
            const [, , w, h] = viewBox.split(' ').map(Number);
            if (doc.getCanvasInfo().elementCount === 0) {
              createDocument(w, h, 'transparent');
            }
          }

          // 내부 요소들 추가
          doc.addRawElement(innerContent);

          getHistoryManager().record(
            'trace_color',
            `컬러 트레이싱: ${path.basename(imagePath)}`,
            doc.toJSON()
          );
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `컬러 이미지가 벡터로 변환되었습니다.`,
              source: path.basename(imagePath),
              colorLevels: colors,
              viewBox,
              addedToCanvas: addToCanvas,
              svgCode: svg
            }, null, 2)
          }]
        };

      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error)
            }, null, 2)
          }]
        };
      }
    }
  );

  // trace_outline: 외곽선만 추출
  server.tool(
    'trace_outline',
    '이미지의 외곽선만 추출하여 벡터로 변환합니다.',
    {
      imagePath: z.string().describe('이미지 파일 경로'),
      threshold: z.number().min(0).max(255).optional().default(128)
        .describe('흑백 변환 임계값'),
      strokeWidth: z.number().min(0.5).max(20).optional().default(2)
        .describe('외곽선 두께'),
      strokeColor: z.string().optional().default('#000000')
        .describe('외곽선 색상'),
      addToCanvas: z.boolean().optional().default(true)
        .describe('현재 캔버스에 추가할지 여부')
    },
    async ({ imagePath, threshold, strokeWidth, strokeColor, addToCanvas }) => {
      try {
        if (!fs.existsSync(imagePath)) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: `파일을 찾을 수 없습니다: ${imagePath}`
              }, null, 2)
            }]
          };
        }

        const params: PotraceParams = {
          threshold,
          color: 'none', // fill 없음
          background: 'transparent'
        };

        const svg = await traceImage(imagePath, params);
        const { paths, viewBox } = extractPathsFromSVG(svg);

        if (paths.length === 0) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: '외곽선을 추출할 수 없습니다.'
              }, null, 2)
            }]
          };
        }

        if (addToCanvas) {
          const doc = getCurrentDocument();

          if (viewBox) {
            const [, , w, h] = viewBox.split(' ').map(Number);
            if (doc.getCanvasInfo().elementCount === 0) {
              createDocument(w, h, 'transparent');
            }
          }

          // 외곽선 스타일로 패스 추가
          paths.forEach((d, index) => {
            doc.addRawElement(
              `<path d="${d}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" id="outline-path-${index + 1}" />`
            );
          });

          getHistoryManager().record(
            'trace_outline',
            `외곽선 추출: ${path.basename(imagePath)}`,
            doc.toJSON()
          );
        }

        // 결과 SVG 생성
        const outlineSvg = paths.map((d, i) =>
          `<path d="${d}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" />`
        ).join('\n');

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `외곽선이 추출되었습니다.`,
              source: path.basename(imagePath),
              pathCount: paths.length,
              strokeWidth,
              strokeColor,
              viewBox,
              addedToCanvas: addToCanvas
            }, null, 2)
          }]
        };

      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error)
            }, null, 2)
          }]
        };
      }
    }
  );

  // trace_silhouette: 실루엣 추출
  server.tool(
    'trace_silhouette',
    '이미지의 실루엣(단색 형태)을 추출합니다.',
    {
      imagePath: z.string().describe('이미지 파일 경로'),
      threshold: z.number().min(0).max(255).optional().default(128)
        .describe('흑백 변환 임계값'),
      fillColor: z.string().optional().default('#000000')
        .describe('실루엣 색상'),
      invert: z.boolean().optional().default(false)
        .describe('반전 여부 (배경과 전경 교체)'),
      addToCanvas: z.boolean().optional().default(true)
        .describe('현재 캔버스에 추가할지 여부')
    },
    async ({ imagePath, threshold, fillColor, invert, addToCanvas }) => {
      try {
        if (!fs.existsSync(imagePath)) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: `파일을 찾을 수 없습니다: ${imagePath}`
              }, null, 2)
            }]
          };
        }

        // 반전 시 임계값 조정
        const adjustedThreshold = invert ? (255 - threshold) : threshold;
        const policy = invert ? 'white' : 'black';

        const params: PotraceParams = {
          threshold: adjustedThreshold,
          turnPolicy: policy,
          color: fillColor,
          background: 'transparent',
          turdSize: 4, // 작은 노이즈 제거
          optCurve: true
        };

        const svg = await traceImage(imagePath, params);
        const { paths, viewBox } = extractPathsFromSVG(svg);

        if (paths.length === 0) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: '실루엣을 추출할 수 없습니다. 임계값을 조정해보세요.'
              }, null, 2)
            }]
          };
        }

        if (addToCanvas) {
          const doc = getCurrentDocument();

          if (viewBox) {
            const [, , w, h] = viewBox.split(' ').map(Number);
            if (doc.getCanvasInfo().elementCount === 0) {
              createDocument(w, h, 'transparent');
            }
          }

          paths.forEach((d, index) => {
            doc.addRawElement(`<path d="${d}" fill="${fillColor}" id="silhouette-${index + 1}" />`);
          });

          getHistoryManager().record(
            'trace_silhouette',
            `실루엣 추출: ${path.basename(imagePath)}`,
            doc.toJSON()
          );
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `실루엣이 추출되었습니다.`,
              source: path.basename(imagePath),
              pathCount: paths.length,
              fillColor,
              inverted: invert,
              viewBox,
              addedToCanvas: addToCanvas
            }, null, 2)
          }]
        };

      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error)
            }, null, 2)
          }]
        };
      }
    }
  );
}
