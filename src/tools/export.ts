/**
 * Export Tools
 * SVG, PNG 내보내기 및 미리보기
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { getCurrentDocument } from '../core/document.js';
import { minifySVG } from '../utils/svg-parser.js';

/**
 * Export Tools 등록
 */
export function registerExportTools(server: McpServer): void {
  // export_svg: SVG로 내보내기
  server.tool(
    'export_svg',
    'SVG 파일로 내보냅니다.',
    {
      filePath: z.string().describe('저장할 파일 경로'),
      minify: z.boolean().optional().default(false).describe('코드 압축 여부')
    },
    async ({ filePath, minify }) => {
      try {
        const doc = getCurrentDocument();
        let svg = doc.exportSVG({ pretty: !minify });

        if (minify) {
          svg = minifySVG(svg);
        }

        await fs.writeFile(filePath, svg, 'utf-8');

        const stats = await fs.stat(filePath);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: 'SVG 파일이 내보내졌습니다.',
              filePath,
              fileSize: `${(stats.size / 1024).toFixed(2)} KB`,
              minified: minify
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : '내보내기에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );

  // export_code: SVG 코드 반환
  server.tool(
    'export_code',
    '현재 캔버스의 SVG 코드를 반환합니다.',
    {
      format: z.enum(['raw', 'pretty', 'minified']).optional().default('pretty').describe('출력 형식')
    },
    async ({ format }) => {
      try {
        const doc = getCurrentDocument();
        let svg: string;

        switch (format) {
          case 'minified':
            svg = minifySVG(doc.exportSVG({ pretty: false }));
            break;
          case 'raw':
            svg = doc.exportSVG({ pretty: false });
            break;
          case 'pretty':
          default:
            svg = doc.exportSVG({ pretty: true });
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              format,
              length: svg.length,
              code: svg
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : '코드 생성에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );

  // preview_browser: 브라우저에서 미리보기
  server.tool(
    'preview_browser',
    '현재 캔버스를 브라우저에서 미리봅니다. (Playwright MCP 연동)',
    {
      openBrowser: z.boolean().optional().default(true).describe('브라우저 자동 열기')
    },
    async ({ openBrowser }) => {
      try {
        const doc = getCurrentDocument();
        const svg = doc.exportSVG({ pretty: true });
        const info = doc.getCanvasInfo();

        // 임시 HTML 파일 생성
        const tempDir = os.tmpdir();
        const htmlPath = path.join(tempDir, `svg-preview-${Date.now()}.html`);

        const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>SVG Preview</title>
  <style>
    body {
      margin: 0;
      padding: 20px;
      background: #f0f0f0;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      font-family: system-ui, sans-serif;
    }
    .container {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .info {
      margin-bottom: 15px;
      padding: 10px;
      background: #f5f5f5;
      border-radius: 4px;
      font-size: 14px;
      color: #666;
    }
    svg {
      display: block;
      border: 1px solid #ddd;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="info">
      Size: ${info.width} x ${info.height} |
      Elements: ${info.elementCount} |
      ${info.filePath ? `File: ${path.basename(info.filePath)}` : 'Unsaved'}
    </div>
    ${svg}
  </div>
</body>
</html>`;

        await fs.writeFile(htmlPath, html, 'utf-8');

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: '미리보기 파일이 생성되었습니다.',
              previewPath: htmlPath,
              fileUrl: `file://${htmlPath}`,
              canvasSize: { width: info.width, height: info.height },
              elementCount: info.elementCount,
              note: openBrowser
                ? 'Playwright MCP의 browser_navigate 도구를 사용하여 미리보기를 열 수 있습니다.'
                : '브라우저에서 위 URL을 열어 미리보기를 확인하세요.'
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : '미리보기 생성에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );

  // export_data_uri: Data URI 형식으로 내보내기
  server.tool(
    'export_data_uri',
    'SVG를 Data URI 형식으로 변환합니다. (이미지 태그에 직접 사용 가능)',
    {
      encode: z.enum(['base64', 'url']).optional().default('base64').describe('인코딩 방식')
    },
    async ({ encode }) => {
      try {
        const doc = getCurrentDocument();
        const svg = doc.exportSVG({ pretty: false });

        let dataUri: string;
        if (encode === 'base64') {
          const base64 = Buffer.from(svg).toString('base64');
          dataUri = `data:image/svg+xml;base64,${base64}`;
        } else {
          const encoded = encodeURIComponent(svg);
          dataUri = `data:image/svg+xml,${encoded}`;
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: 'Data URI가 생성되었습니다.',
              encoding: encode,
              length: dataUri.length,
              dataUri,
              usage: `<img src="${dataUri.substring(0, 50)}..." />`
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : 'Data URI 생성에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );

  // export_png: PNG로 내보내기 (Sharp 의존성 필요)
  server.tool(
    'export_png',
    'PNG 파일로 내보냅니다. (참고: 현재는 SVG를 저장하고 별도 변환 도구 사용 권장)',
    {
      filePath: z.string().describe('저장할 파일 경로'),
      scale: z.number().min(0.1).max(10).optional().default(1).describe('스케일 배율'),
      background: z.string().optional().describe('배경색 (기본: 투명)')
    },
    async ({ filePath, scale, background }) => {
      try {
        // Sharp 라이브러리가 있으면 변환, 없으면 안내 메시지
        const doc = getCurrentDocument();
        const svg = doc.exportSVG({ pretty: false });
        const info = doc.getCanvasInfo();

        // SVG 파일로 먼저 저장
        const svgPath = filePath.replace(/\.png$/i, '.svg');
        await fs.writeFile(svgPath, svg, 'utf-8');

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: 'SVG 파일이 저장되었습니다. PNG 변환을 위해 다음 방법을 사용하세요.',
              svgPath,
              requestedPngPath: filePath,
              suggestedSize: {
                width: Math.round(info.width * scale),
                height: Math.round(info.height * scale)
              },
              conversionOptions: [
                {
                  method: 'Inkscape CLI',
                  command: `inkscape "${svgPath}" -o "${filePath}" -w ${Math.round(info.width * scale)} -h ${Math.round(info.height * scale)}`
                },
                {
                  method: 'ImageMagick',
                  command: `convert -background "${background || 'transparent'}" -density ${96 * scale} "${svgPath}" "${filePath}"`
                },
                {
                  method: 'rsvg-convert',
                  command: `rsvg-convert -w ${Math.round(info.width * scale)} -h ${Math.round(info.height * scale)} "${svgPath}" -o "${filePath}"`
                }
              ],
              note: 'PNG 직접 변환을 위해서는 Sharp 패키지 설치가 필요합니다: npm install sharp'
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : 'PNG 내보내기에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );
}
