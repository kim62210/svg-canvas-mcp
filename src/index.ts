#!/usr/bin/env node
/**
 * SVG Canvas MCP Server
 * 진입점
 */

import { startServer } from './server.js';

// 서버 시작
startServer().catch((error) => {
  console.error('서버 시작 실패:', error);
  process.exit(1);
});
