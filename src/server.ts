/**
 * SVG Canvas MCP Server
 * McpServer 초기화 및 설정
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// Tool 등록 함수들
import { registerCanvasTools } from './tools/canvas.js';
import { registerDrawingTools } from './tools/drawing.js';
import { registerPathTools } from './tools/path.js';
import { registerLayerTools } from './tools/layer.js';
import { registerObjectTools } from './tools/object.js';
import { registerStyleTools } from './tools/style.js';
import { registerAnimationTools } from './tools/animation.js';
import { registerSymbolTools } from './tools/symbol.js';
import { registerHistoryTools } from './tools/history.js';
import { registerExportTools } from './tools/export.js';
import { registerAITools } from './tools/ai.js';

// 블로그 운영 필수 기능
import { registerPresetTools } from './tools/preset.js';
import { registerChartTools } from './tools/chart.js';
import { registerDiagramTools } from './tools/diagram.js';
import { registerQRCodeTools } from './tools/qrcode.js';
import { registerWatermarkTools } from './tools/watermark.js';

// 이미지 트레이싱
import { registerTraceTools } from './tools/trace.js';

/**
 * MCP 서버 생성 및 초기화
 */
export function createServer(): McpServer {
  const server = new McpServer({
    name: 'svg-canvas',
    version: '1.0.0',
    description: 'Photoshop-level SVG drawing MCP server for Claude Code'
  });

  // 모든 도구 등록
  registerCanvasTools(server);
  registerDrawingTools(server);
  registerPathTools(server);
  registerLayerTools(server);
  registerObjectTools(server);
  registerStyleTools(server);
  registerAnimationTools(server);
  registerSymbolTools(server);
  registerHistoryTools(server);
  registerExportTools(server);
  registerAITools(server);

  // 블로그 운영 필수 기능 등록
  registerPresetTools(server);
  registerChartTools(server);
  registerDiagramTools(server);
  registerQRCodeTools(server);
  registerWatermarkTools(server);

  // 이미지 트레이싱 등록
  registerTraceTools(server);

  return server;
}

/**
 * 서버 시작
 */
export async function startServer(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);

  // 종료 시그널 처리
  process.on('SIGINT', async () => {
    await server.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await server.close();
    process.exit(0);
  });
}
