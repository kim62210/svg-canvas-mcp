/**
 * Diagram Tools
 * 2D/3D 다이어그램 생성 도구 - 플로우차트, 마인드맵, 시퀀스, 아이소메트릭 등
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getCurrentDocument, createDocument } from '../core/document.js';
import { getLayerManager } from '../core/layer-manager.js';
import { getHistoryManager } from '../core/history-manager.js';
import { createRect, createText, createCircle, createLine } from '../core/element.js';

// 기본 색상
const COLORS = {
  primary: '#3498db',
  secondary: '#2ecc71',
  accent: '#e74c3c',
  warning: '#f39c12',
  info: '#9b59b6',
  dark: '#34495e',
  light: '#ecf0f1',
  connector: '#7f8c8d'
};

// 노드 스키마
const nodeSchema = z.object({
  id: z.string().describe('노드 ID'),
  label: z.string().describe('노드 라벨'),
  type: z.enum(['process', 'decision', 'start', 'end', 'data', 'document', 'manual', 'database']).optional().default('process'),
  color: z.string().optional()
});

// 연결 스키마
const connectionSchema = z.object({
  from: z.string().describe('시작 노드 ID'),
  to: z.string().describe('끝 노드 ID'),
  label: z.string().optional().describe('연결선 라벨'),
  type: z.enum(['arrow', 'line', 'dashed']).optional().default('arrow')
});

/**
 * Diagram Tools 등록
 */
export function registerDiagramTools(server: McpServer): void {
  // diagram_flowchart: 플로우차트
  server.tool(
    'diagram_flowchart',
    '플로우차트를 생성합니다.',
    {
      nodes: z.array(nodeSchema).describe('노드 배열'),
      connections: z.array(connectionSchema).describe('연결 배열'),
      direction: z.enum(['vertical', 'horizontal']).optional().default('vertical').describe('방향'),
      width: z.number().optional().default(800).describe('너비'),
      height: z.number().optional().default(600).describe('높이'),
      title: z.string().optional().describe('제목'),
      backgroundColor: z.string().optional().default('#ffffff')
    },
    async ({ nodes, connections, direction, width, height, title, backgroundColor }) => {
      try {
        createDocument(width, height, backgroundColor);
        const doc = getCurrentDocument();

        doc.addElement(createRect(0, 0, width, height, { fill: backgroundColor, id: 'bg' }));

        const padding = { top: title ? 60 : 40, bottom: 40, left: 40, right: 40 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        if (title) {
          doc.addElement(createText(width / 2, 30, title, {
            fontSize: 20, fontWeight: 'bold', fontFamily: 'Arial, sans-serif',
            textAnchor: 'middle', fill: '#333333', id: 'title'
          }));
        }

        // 노드 크기 및 위치 계산
        const nodeWidth = direction === 'vertical' ? 140 : 120;
        const nodeHeight = direction === 'vertical' ? 50 : 60;

        // 레벨별 노드 그룹화 (간단한 구현: 연결 순서 기반)
        const nodePositions: Map<string, { x: number; y: number }> = new Map();
        const visited = new Set<string>();
        const levels: string[][] = [];

        // BFS로 레벨 할당
        function assignLevels(startNodes: string[]) {
          let currentLevel = startNodes;
          while (currentLevel.length > 0) {
            levels.push(currentLevel);
            currentLevel.forEach(n => visited.add(n));
            const nextLevel: string[] = [];
            currentLevel.forEach(fromId => {
              connections
                .filter(c => c.from === fromId && !visited.has(c.to))
                .forEach(c => {
                  if (!nextLevel.includes(c.to)) nextLevel.push(c.to);
                });
            });
            currentLevel = nextLevel;
          }
        }

        // 시작 노드 찾기 (들어오는 연결이 없는 노드)
        const incomingCount = new Map<string, number>();
        nodes.forEach(n => incomingCount.set(n.id, 0));
        connections.forEach(c => {
          incomingCount.set(c.to, (incomingCount.get(c.to) || 0) + 1);
        });
        const startNodes = nodes.filter(n => incomingCount.get(n.id) === 0).map(n => n.id);
        if (startNodes.length === 0 && nodes.length > 0) startNodes.push(nodes[0].id);

        assignLevels(startNodes);

        // 남은 노드 추가
        nodes.forEach(n => {
          if (!visited.has(n.id)) {
            levels.push([n.id]);
          }
        });

        // 위치 계산
        if (direction === 'vertical') {
          const gapY = Math.min(80, chartHeight / levels.length);
          levels.forEach((level, levelIdx) => {
            const levelY = padding.top + levelIdx * gapY + gapY / 2;
            const gapX = chartWidth / (level.length + 1);
            level.forEach((nodeId, nodeIdx) => {
              nodePositions.set(nodeId, {
                x: padding.left + (nodeIdx + 1) * gapX,
                y: levelY
              });
            });
          });
        } else {
          const gapX = Math.min(160, chartWidth / levels.length);
          levels.forEach((level, levelIdx) => {
            const levelX = padding.left + levelIdx * gapX + gapX / 2;
            const gapY = chartHeight / (level.length + 1);
            level.forEach((nodeId, nodeIdx) => {
              nodePositions.set(nodeId, {
                x: levelX,
                y: padding.top + (nodeIdx + 1) * gapY
              });
            });
          });
        }

        // 연결선 그리기 (먼저)
        connections.forEach((conn, i) => {
          const fromPos = nodePositions.get(conn.from);
          const toPos = nodePositions.get(conn.to);
          if (!fromPos || !toPos) return;

          let x1 = fromPos.x, y1 = fromPos.y, x2 = toPos.x, y2 = toPos.y;

          // 노드 테두리에서 시작/끝
          if (direction === 'vertical') {
            y1 += nodeHeight / 2;
            y2 -= nodeHeight / 2;
          } else {
            x1 += nodeWidth / 2;
            x2 -= nodeWidth / 2;
          }

          const strokeStyle = conn.type === 'dashed' ? 'stroke-dasharray="5,5"' : '';
          const color = COLORS.connector;

          // 화살표 마커 정의
          if (conn.type === 'arrow' && i === 0) {
            doc.addDefs(`
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="${color}" />
              </marker>
            `);
          }

          const markerEnd = conn.type === 'arrow' ? 'marker-end="url(#arrowhead)"' : '';

          // 곡선 경로 (간단한 직선 사용)
          doc.addRawElement(`
            <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"
                  stroke="${color}" stroke-width="2" ${strokeStyle} ${markerEnd} id="conn-${i}" />
          `);

          // 연결선 라벨
          if (conn.label) {
            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;
            doc.addElement(createText(midX + 5, midY - 5, conn.label, {
              fontSize: 10, fontFamily: 'Arial, sans-serif', fill: '#666666', id: `conn-label-${i}`
            }));
          }
        });

        // 노드 그리기
        nodes.forEach((node, i) => {
          const pos = nodePositions.get(node.id);
          if (!pos) return;

          const color = node.color || COLORS.primary;
          const x = pos.x - nodeWidth / 2;
          const y = pos.y - nodeHeight / 2;

          switch (node.type) {
            case 'start':
            case 'end':
              // 타원형
              doc.addRawElement(`
                <ellipse cx="${pos.x}" cy="${pos.y}" rx="${nodeWidth / 2}" ry="${nodeHeight / 2}"
                         fill="${node.type === 'start' ? COLORS.secondary : COLORS.accent}"
                         stroke="#ffffff" stroke-width="2" id="node-${i}" />
              `);
              break;
            case 'decision':
              // 마름모
              doc.addRawElement(`
                <polygon points="${pos.x},${y} ${pos.x + nodeWidth / 2},${pos.y}
                                ${pos.x},${y + nodeHeight} ${pos.x - nodeWidth / 2},${pos.y}"
                         fill="${color}" stroke="#ffffff" stroke-width="2" id="node-${i}" />
              `);
              break;
            case 'data':
              // 평행사변형
              const offset = 15;
              doc.addRawElement(`
                <polygon points="${x + offset},${y} ${x + nodeWidth},${y}
                                ${x + nodeWidth - offset},${y + nodeHeight} ${x},${y + nodeHeight}"
                         fill="${color}" stroke="#ffffff" stroke-width="2" id="node-${i}" />
              `);
              break;
            case 'database':
              // 원통형 (간소화)
              doc.addRawElement(`
                <ellipse cx="${pos.x}" cy="${y + 10}" rx="${nodeWidth / 2}" ry="10"
                         fill="${color}" stroke="#ffffff" stroke-width="2" />
                <rect x="${x}" y="${y + 10}" width="${nodeWidth}" height="${nodeHeight - 20}"
                      fill="${color}" stroke="none" />
                <ellipse cx="${pos.x}" cy="${y + nodeHeight - 10}" rx="${nodeWidth / 2}" ry="10"
                         fill="${color}" stroke="#ffffff" stroke-width="2" id="node-${i}" />
                <path d="M ${x} ${y + 10} L ${x} ${y + nodeHeight - 10}" stroke="#ffffff" stroke-width="2" />
                <path d="M ${x + nodeWidth} ${y + 10} L ${x + nodeWidth} ${y + nodeHeight - 10}" stroke="#ffffff" stroke-width="2" />
              `);
              break;
            default:
              // 사각형 (process, document 등)
              const rx = node.type === 'document' ? 0 : 5;
              doc.addElement(createRect(x, y, nodeWidth, nodeHeight, {
                fill: color, stroke: '#ffffff', strokeWidth: 2, rx, id: `node-${i}`
              }));
          }

          // 노드 라벨
          doc.addElement(createText(pos.x, pos.y + 4, node.label, {
            fontSize: 12, fontWeight: 'bold', fontFamily: 'Arial, sans-serif',
            textAnchor: 'middle', fill: '#ffffff', id: `node-label-${i}`
          }));
        });

        getHistoryManager().record('diagram_flowchart', `플로우차트 생성: ${nodes.length}개 노드`, doc.toJSON());

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: '플로우차트가 생성되었습니다.',
              diagram: { type: 'flowchart', direction, nodeCount: nodes.length, connectionCount: connections.length }
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ success: false, error: error instanceof Error ? error.message : '다이어그램 생성 실패' }) }],
          isError: true
        };
      }
    }
  );

  // diagram_mindmap: 마인드맵
  server.tool(
    'diagram_mindmap',
    '마인드맵을 생성합니다.',
    {
      root: z.object({
        label: z.string().describe('중심 주제'),
        children: z.array(z.object({
          label: z.string(),
          color: z.string().optional(),
          children: z.array(z.object({
            label: z.string(),
            color: z.string().optional()
          })).optional()
        })).describe('하위 주제들')
      }).describe('마인드맵 구조'),
      width: z.number().optional().default(1000).describe('너비'),
      height: z.number().optional().default(700).describe('높이'),
      backgroundColor: z.string().optional().default('#ffffff')
    },
    async ({ root, width, height, backgroundColor }) => {
      try {
        createDocument(width, height, backgroundColor);
        const doc = getCurrentDocument();

        doc.addElement(createRect(0, 0, width, height, { fill: backgroundColor, id: 'bg' }));

        const centerX = width / 2;
        const centerY = height / 2;
        const branchColors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#34495e'];

        // 중심 노드
        const rootRadius = 60;
        doc.addElement(createCircle(centerX, centerY, rootRadius, {
          fill: COLORS.primary, stroke: '#ffffff', strokeWidth: 3, id: 'root'
        }));
        doc.addElement(createText(centerX, centerY + 5, root.label, {
          fontSize: 16, fontWeight: 'bold', fontFamily: 'Arial, sans-serif',
          textAnchor: 'middle', fill: '#ffffff', id: 'root-label'
        }));

        if (!root.children || root.children.length === 0) {
          getHistoryManager().record('diagram_mindmap', '마인드맵 생성: 1개 노드', doc.toJSON());
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({ success: true, message: '마인드맵이 생성되었습니다.', nodeCount: 1 }, null, 2)
            }]
          };
        }

        const branchCount = root.children.length;
        const angleStep = (2 * Math.PI) / branchCount;
        const firstLevelRadius = 180;
        const secondLevelRadius = 120;

        root.children.forEach((branch, i) => {
          const angle = -Math.PI / 2 + i * angleStep;
          const branchColor = branch.color || branchColors[i % branchColors.length];

          const x1 = centerX + rootRadius * Math.cos(angle);
          const y1 = centerY + rootRadius * Math.sin(angle);
          const x2 = centerX + firstLevelRadius * Math.cos(angle);
          const y2 = centerY + firstLevelRadius * Math.sin(angle);

          // 브랜치 연결선 (곡선)
          const ctrlX = centerX + (firstLevelRadius * 0.5) * Math.cos(angle);
          const ctrlY = centerY + (firstLevelRadius * 0.5) * Math.sin(angle);
          doc.addRawElement(`
            <path d="M ${x1} ${y1} Q ${ctrlX} ${ctrlY} ${x2} ${y2}"
                  fill="none" stroke="${branchColor}" stroke-width="4" stroke-linecap="round" id="branch-${i}" />
          `);

          // 1단계 노드
          const nodeWidth = Math.min(branch.label.length * 9 + 20, 120);
          const nodeHeight = 30;
          doc.addElement(createRect(x2 - nodeWidth / 2, y2 - nodeHeight / 2, nodeWidth, nodeHeight, {
            fill: branchColor, rx: 15, id: `node-1-${i}`
          }));
          doc.addElement(createText(x2, y2 + 5, branch.label, {
            fontSize: 12, fontWeight: 'bold', fontFamily: 'Arial, sans-serif',
            textAnchor: 'middle', fill: '#ffffff', id: `node-1-label-${i}`
          }));

          // 2단계 노드
          if (branch.children && branch.children.length > 0) {
            const subAngleSpread = Math.PI / 4;
            const subAngleStep = subAngleSpread / (branch.children.length + 1);
            const baseAngle = angle - subAngleSpread / 2;

            branch.children.forEach((child, j) => {
              const subAngle = baseAngle + (j + 1) * subAngleStep;
              const sx2 = x2 + secondLevelRadius * Math.cos(subAngle);
              const sy2 = y2 + secondLevelRadius * Math.sin(subAngle);

              // 2단계 연결선
              doc.addRawElement(`
                <line x1="${x2}" y1="${y2}" x2="${sx2}" y2="${sy2}"
                      stroke="${branchColor}" stroke-width="2" opacity="0.6" id="sub-branch-${i}-${j}" />
              `);

              // 2단계 노드
              const subNodeWidth = Math.min(child.label.length * 8 + 16, 100);
              const subNodeHeight = 24;
              const subColor = child.color || branchColor;
              doc.addElement(createRect(sx2 - subNodeWidth / 2, sy2 - subNodeHeight / 2, subNodeWidth, subNodeHeight, {
                fill: subColor, opacity: 0.8, rx: 12, id: `node-2-${i}-${j}`
              }));
              doc.addElement(createText(sx2, sy2 + 4, child.label, {
                fontSize: 10, fontFamily: 'Arial, sans-serif',
                textAnchor: 'middle', fill: '#ffffff', id: `node-2-label-${i}-${j}`
              }));
            });
          }
        });

        const totalNodes = 1 + root.children.length + root.children.reduce((sum, b) => sum + (b.children?.length || 0), 0);
        getHistoryManager().record('diagram_mindmap', `마인드맵 생성: ${totalNodes}개 노드`, doc.toJSON());

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: '마인드맵이 생성되었습니다.',
              diagram: { type: 'mindmap', nodeCount: totalNodes, depth: 2 }
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ success: false, error: error instanceof Error ? error.message : '다이어그램 생성 실패' }) }],
          isError: true
        };
      }
    }
  );

  // diagram_sequence: 시퀀스 다이어그램
  server.tool(
    'diagram_sequence',
    '시퀀스 다이어그램을 생성합니다.',
    {
      participants: z.array(z.object({
        id: z.string(),
        label: z.string(),
        color: z.string().optional()
      })).describe('참여자 목록'),
      messages: z.array(z.object({
        from: z.string().describe('발신자 ID'),
        to: z.string().describe('수신자 ID'),
        label: z.string().describe('메시지'),
        type: z.enum(['sync', 'async', 'return']).optional().default('sync')
      })).describe('메시지 목록'),
      width: z.number().optional().default(800).describe('너비'),
      height: z.number().optional().default(600).describe('높이'),
      title: z.string().optional().describe('제목'),
      backgroundColor: z.string().optional().default('#ffffff')
    },
    async ({ participants, messages, width, height, title, backgroundColor }) => {
      try {
        createDocument(width, height, backgroundColor);
        const doc = getCurrentDocument();

        doc.addElement(createRect(0, 0, width, height, { fill: backgroundColor, id: 'bg' }));

        const padding = { top: title ? 70 : 50, bottom: 30, left: 30, right: 30 };
        const chartWidth = width - padding.left - padding.right;

        if (title) {
          doc.addElement(createText(width / 2, 30, title, {
            fontSize: 18, fontWeight: 'bold', fontFamily: 'Arial, sans-serif',
            textAnchor: 'middle', fill: '#333333', id: 'title'
          }));
        }

        // 화살표 마커 정의
        doc.addDefs(`
          <marker id="seq-arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#333333" />
          </marker>
          <marker id="seq-arrow-open" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polyline points="0 0, 10 3.5, 0 7" fill="none" stroke="#333333" stroke-width="1" />
          </marker>
        `);

        // 참여자 위치 계산
        const participantWidth = 100;
        const participantHeight = 40;
        const gap = (chartWidth - participantWidth) / (participants.length);
        const participantX: Map<string, number> = new Map();

        participants.forEach((p, i) => {
          const x = padding.left + participantWidth / 2 + i * gap;
          participantX.set(p.id, x);
          const color = p.color || COLORS.primary;

          // 참여자 박스 (상단)
          doc.addElement(createRect(x - participantWidth / 2, padding.top, participantWidth, participantHeight, {
            fill: color, rx: 5, id: `participant-top-${i}`
          }));
          doc.addElement(createText(x, padding.top + participantHeight / 2 + 5, p.label, {
            fontSize: 12, fontWeight: 'bold', fontFamily: 'Arial, sans-serif',
            textAnchor: 'middle', fill: '#ffffff', id: `participant-label-top-${i}`
          }));

          // 생명선 (점선)
          const lifelineTop = padding.top + participantHeight;
          const lifelineBottom = height - padding.bottom - participantHeight - 10;
          doc.addRawElement(`
            <line x1="${x}" y1="${lifelineTop}" x2="${x}" y2="${lifelineBottom}"
                  stroke="#999999" stroke-width="1" stroke-dasharray="5,5" id="lifeline-${i}" />
          `);

          // 참여자 박스 (하단)
          doc.addElement(createRect(x - participantWidth / 2, height - padding.bottom - participantHeight, participantWidth, participantHeight, {
            fill: color, rx: 5, id: `participant-bottom-${i}`
          }));
          doc.addElement(createText(x, height - padding.bottom - participantHeight / 2 + 5, p.label, {
            fontSize: 12, fontWeight: 'bold', fontFamily: 'Arial, sans-serif',
            textAnchor: 'middle', fill: '#ffffff', id: `participant-label-bottom-${i}`
          }));
        });

        // 메시지 그리기
        const messageStartY = padding.top + participantHeight + 30;
        const messageGap = Math.min(50, (height - padding.bottom - participantHeight - messageStartY - 20) / messages.length);

        messages.forEach((msg, i) => {
          const fromX = participantX.get(msg.from) || 0;
          const toX = participantX.get(msg.to) || 0;
          const y = messageStartY + i * messageGap;

          const isReverse = fromX > toX;
          const x1 = isReverse ? fromX - 5 : fromX + 5;
          const x2 = isReverse ? toX + 5 : toX - 5;

          // 메시지 선
          let strokeDash = '';
          let marker = 'url(#seq-arrow)';
          if (msg.type === 'async') {
            marker = 'url(#seq-arrow-open)';
          } else if (msg.type === 'return') {
            strokeDash = 'stroke-dasharray="5,3"';
          }

          doc.addRawElement(`
            <line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}"
                  stroke="#333333" stroke-width="1.5" ${strokeDash} marker-end="${marker}" id="msg-${i}" />
          `);

          // 메시지 라벨
          const labelX = (x1 + x2) / 2;
          doc.addElement(createText(labelX, y - 8, msg.label, {
            fontSize: 11, fontFamily: 'Arial, sans-serif',
            textAnchor: 'middle', fill: '#333333', id: `msg-label-${i}`
          }));
        });

        getHistoryManager().record('diagram_sequence', `시퀀스 다이어그램 생성: ${participants.length}명, ${messages.length}개 메시지`, doc.toJSON());

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: '시퀀스 다이어그램이 생성되었습니다.',
              diagram: { type: 'sequence', participantCount: participants.length, messageCount: messages.length }
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ success: false, error: error instanceof Error ? error.message : '다이어그램 생성 실패' }) }],
          isError: true
        };
      }
    }
  );

  // diagram_isometric: 아이소메트릭 블록 다이어그램
  server.tool(
    'diagram_isometric',
    '아이소메트릭 블록 다이어그램을 생성합니다.',
    {
      blocks: z.array(z.object({
        id: z.string(),
        label: z.string(),
        type: z.enum(['cube', 'cylinder', 'server', 'database', 'cloud', 'user', 'document']).optional().default('cube'),
        color: z.string().optional(),
        position: z.object({
          x: z.number().describe('그리드 X 위치'),
          y: z.number().describe('그리드 Y 위치'),
          z: z.number().optional().default(0).describe('높이 레벨')
        })
      })).describe('블록 배열'),
      connections: z.array(z.object({
        from: z.string(),
        to: z.string(),
        label: z.string().optional()
      })).optional().describe('연결선'),
      width: z.number().optional().default(800).describe('너비'),
      height: z.number().optional().default(600).describe('높이'),
      title: z.string().optional().describe('제목'),
      backgroundColor: z.string().optional().default('#f8f9fa')
    },
    async ({ blocks, connections, width, height, title, backgroundColor }) => {
      try {
        createDocument(width, height, backgroundColor);
        const doc = getCurrentDocument();

        doc.addElement(createRect(0, 0, width, height, { fill: backgroundColor, id: 'bg' }));

        if (title) {
          doc.addElement(createText(width / 2, 30, title, {
            fontSize: 18, fontWeight: 'bold', fontFamily: 'Arial, sans-serif',
            textAnchor: 'middle', fill: '#333333', id: 'title'
          }));
        }

        // 아이소메트릭 변환 함수
        const isoAngle = Math.PI / 6; // 30도
        const gridSize = 80;
        const centerX = width / 2;
        const centerY = height / 2;

        function toIso(gridX: number, gridY: number, gridZ: number = 0): { x: number; y: number } {
          const isoX = centerX + (gridX - gridY) * gridSize * Math.cos(isoAngle);
          const isoY = centerY + (gridX + gridY) * gridSize * Math.sin(isoAngle) - gridZ * gridSize * 0.5;
          return { x: isoX, y: isoY };
        }

        // 블록 위치 저장
        const blockPositions: Map<string, { x: number; y: number }> = new Map();

        // Z순서로 정렬 (뒤에서 앞으로)
        const sortedBlocks = [...blocks].sort((a, b) => {
          const aZ = a.position.z || 0;
          const bZ = b.position.z || 0;
          return (a.position.x + a.position.y - aZ) - (b.position.x + b.position.y - bZ);
        });

        // 블록 그리기
        sortedBlocks.forEach((block, i) => {
          const pos = toIso(block.position.x, block.position.y, block.position.z || 0);
          blockPositions.set(block.id, pos);

          const baseColor = block.color || COLORS.primary;
          const topColor = adjustColor(baseColor, 30);
          const leftColor = adjustColor(baseColor, -20);
          const rightColor = adjustColor(baseColor, -40);

          const size = gridSize * 0.7;
          const halfSize = size / 2;

          switch (block.type) {
            case 'cube':
              // 큐브
              const cubeTop = `${pos.x},${pos.y - size / 2}
                              ${pos.x + halfSize},${pos.y - size / 4}
                              ${pos.x},${pos.y}
                              ${pos.x - halfSize},${pos.y - size / 4}`;
              const cubeLeft = `${pos.x - halfSize},${pos.y - size / 4}
                               ${pos.x},${pos.y}
                               ${pos.x},${pos.y + size / 2}
                               ${pos.x - halfSize},${pos.y + size / 4}`;
              const cubeRight = `${pos.x},${pos.y}
                                ${pos.x + halfSize},${pos.y - size / 4}
                                ${pos.x + halfSize},${pos.y + size / 4}
                                ${pos.x},${pos.y + size / 2}`;

              doc.addRawElement(`<polygon points="${cubeLeft}" fill="${leftColor}" stroke="#ffffff" stroke-width="1" />`);
              doc.addRawElement(`<polygon points="${cubeRight}" fill="${rightColor}" stroke="#ffffff" stroke-width="1" />`);
              doc.addRawElement(`<polygon points="${cubeTop}" fill="${topColor}" stroke="#ffffff" stroke-width="1" id="block-${block.id}" />`);
              break;

            case 'cylinder':
              // 원통
              const cylRx = halfSize;
              const cylRy = halfSize / 3;
              const cylHeight = size * 0.8;
              doc.addRawElement(`
                <ellipse cx="${pos.x}" cy="${pos.y + cylHeight / 2}" rx="${cylRx}" ry="${cylRy}"
                         fill="${leftColor}" stroke="#ffffff" stroke-width="1" />
                <rect x="${pos.x - cylRx}" y="${pos.y - cylHeight / 2}" width="${cylRx * 2}" height="${cylHeight}"
                      fill="${baseColor}" stroke="none" />
                <ellipse cx="${pos.x}" cy="${pos.y - cylHeight / 2}" rx="${cylRx}" ry="${cylRy}"
                         fill="${topColor}" stroke="#ffffff" stroke-width="1" id="block-${block.id}" />
                <line x1="${pos.x - cylRx}" y1="${pos.y - cylHeight / 2}" x2="${pos.x - cylRx}" y2="${pos.y + cylHeight / 2}"
                      stroke="#ffffff" stroke-width="1" />
                <line x1="${pos.x + cylRx}" y1="${pos.y - cylHeight / 2}" x2="${pos.x + cylRx}" y2="${pos.y + cylHeight / 2}"
                      stroke="#ffffff" stroke-width="1" />
              `);
              break;

            case 'server':
              // 서버 (여러 층)
              for (let layer = 2; layer >= 0; layer--) {
                const layerY = pos.y - layer * 15;
                const serverTop = `${pos.x},${layerY - 12}
                                  ${pos.x + halfSize},${layerY - 6}
                                  ${pos.x},${layerY}
                                  ${pos.x - halfSize},${layerY - 6}`;
                const serverLeft = `${pos.x - halfSize},${layerY - 6}
                                   ${pos.x},${layerY}
                                   ${pos.x},${layerY + 12}
                                   ${pos.x - halfSize},${layerY + 6}`;
                const serverRight = `${pos.x},${layerY}
                                    ${pos.x + halfSize},${layerY - 6}
                                    ${pos.x + halfSize},${layerY + 6}
                                    ${pos.x},${layerY + 12}`;
                doc.addRawElement(`<polygon points="${serverLeft}" fill="${leftColor}" stroke="#333" stroke-width="0.5" />`);
                doc.addRawElement(`<polygon points="${serverRight}" fill="${rightColor}" stroke="#333" stroke-width="0.5" />`);
                doc.addRawElement(`<polygon points="${serverTop}" fill="${topColor}" stroke="#333" stroke-width="0.5" />`);
              }
              break;

            case 'cloud':
              // 구름
              doc.addRawElement(`
                <ellipse cx="${pos.x}" cy="${pos.y}" rx="${halfSize * 1.5}" ry="${halfSize * 0.8}"
                         fill="${topColor}" stroke="#ffffff" stroke-width="2" id="block-${block.id}" />
                <ellipse cx="${pos.x - halfSize * 0.6}" cy="${pos.y + 5}" rx="${halfSize * 0.8}" ry="${halfSize * 0.5}"
                         fill="${topColor}" stroke="#ffffff" stroke-width="2" />
                <ellipse cx="${pos.x + halfSize * 0.6}" cy="${pos.y + 5}" rx="${halfSize * 0.8}" ry="${halfSize * 0.5}"
                         fill="${topColor}" stroke="#ffffff" stroke-width="2" />
              `);
              break;

            case 'user':
              // 사용자 아이콘
              doc.addElement(createCircle(pos.x, pos.y - halfSize * 0.5, halfSize * 0.4, {
                fill: topColor, stroke: '#ffffff', strokeWidth: 2
              }));
              doc.addRawElement(`
                <path d="M ${pos.x - halfSize * 0.6} ${pos.y + halfSize * 0.5}
                         Q ${pos.x - halfSize * 0.6} ${pos.y - halfSize * 0.1} ${pos.x} ${pos.y - halfSize * 0.1}
                         Q ${pos.x + halfSize * 0.6} ${pos.y - halfSize * 0.1} ${pos.x + halfSize * 0.6} ${pos.y + halfSize * 0.5}"
                      fill="${topColor}" stroke="#ffffff" stroke-width="2" id="block-${block.id}" />
              `);
              break;

            case 'database':
              // 데이터베이스 (원통형)
              const dbRx = halfSize;
              const dbRy = halfSize / 4;
              const dbHeight = size * 0.6;
              doc.addRawElement(`
                <ellipse cx="${pos.x}" cy="${pos.y + dbHeight / 2}" rx="${dbRx}" ry="${dbRy}"
                         fill="${leftColor}" stroke="#ffffff" stroke-width="1" />
                <rect x="${pos.x - dbRx}" y="${pos.y - dbHeight / 2}" width="${dbRx * 2}" height="${dbHeight}"
                      fill="${baseColor}" stroke="none" />
                <ellipse cx="${pos.x}" cy="${pos.y - dbHeight / 2}" rx="${dbRx}" ry="${dbRy}"
                         fill="${topColor}" stroke="#ffffff" stroke-width="1" id="block-${block.id}" />
                <ellipse cx="${pos.x}" cy="${pos.y}" rx="${dbRx}" ry="${dbRy}"
                         fill="none" stroke="#ffffff" stroke-width="1" opacity="0.5" />
              `);
              break;

            default:
              // 기본 큐브
              doc.addElement(createRect(pos.x - halfSize, pos.y - halfSize, size, size, {
                fill: baseColor, rx: 5, id: `block-${block.id}`
              }));
          }

          // 라벨
          doc.addElement(createText(pos.x, pos.y + size * 0.6, block.label, {
            fontSize: 10, fontFamily: 'Arial, sans-serif', fontWeight: 'bold',
            textAnchor: 'middle', fill: '#333333', id: `label-${block.id}`
          }));
        });

        // 연결선
        if (connections) {
          connections.forEach((conn, i) => {
            const fromPos = blockPositions.get(conn.from);
            const toPos = blockPositions.get(conn.to);
            if (!fromPos || !toPos) return;

            doc.addRawElement(`
              <line x1="${fromPos.x}" y1="${fromPos.y}" x2="${toPos.x}" y2="${toPos.y}"
                    stroke="${COLORS.connector}" stroke-width="2" stroke-dasharray="5,3"
                    marker-end="url(#arrowhead)" id="iso-conn-${i}" />
            `);

            if (conn.label) {
              const midX = (fromPos.x + toPos.x) / 2;
              const midY = (fromPos.y + toPos.y) / 2;
              doc.addElement(createText(midX, midY - 8, conn.label, {
                fontSize: 9, fontFamily: 'Arial, sans-serif', textAnchor: 'middle', fill: '#666666'
              }));
            }
          });
        }

        getHistoryManager().record('diagram_isometric', `아이소메트릭 다이어그램 생성: ${blocks.length}개 블록`, doc.toJSON());

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: '아이소메트릭 다이어그램이 생성되었습니다.',
              diagram: { type: 'isometric', blockCount: blocks.length, connectionCount: connections?.length || 0 }
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ success: false, error: error instanceof Error ? error.message : '다이어그램 생성 실패' }) }],
          isError: true
        };
      }
    }
  );

  // diagram_3d_architecture: 3D 인프라 아키텍처
  server.tool(
    'diagram_3d_architecture',
    '3D 인프라 아키텍처 다이어그램을 생성합니다.',
    {
      layers: z.array(z.object({
        name: z.string().describe('레이어 이름 (예: Frontend, Backend, Database)'),
        color: z.string().optional(),
        components: z.array(z.object({
          id: z.string(),
          label: z.string(),
          icon: z.enum(['server', 'database', 'cloud', 'container', 'api', 'web', 'mobile', 'storage']).optional()
        }))
      })).describe('레이어별 컴포넌트'),
      connections: z.array(z.object({
        from: z.string(),
        to: z.string(),
        label: z.string().optional(),
        bidirectional: z.boolean().optional()
      })).optional().describe('연결선'),
      width: z.number().optional().default(1000).describe('너비'),
      height: z.number().optional().default(700).describe('높이'),
      title: z.string().optional().describe('제목'),
      backgroundColor: z.string().optional().default('#1a1a2e')
    },
    async ({ layers, connections, width, height, title, backgroundColor }) => {
      try {
        createDocument(width, height, backgroundColor);
        const doc = getCurrentDocument();

        doc.addElement(createRect(0, 0, width, height, { fill: backgroundColor, id: 'bg' }));

        // 그라디언트 배경
        doc.addDefs(`
          <linearGradient id="bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#1a1a2e" />
            <stop offset="100%" style="stop-color:#16213e" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        `);
        doc.addElement(createRect(0, 0, width, height, { fill: 'url(#bg-grad)', id: 'bg-gradient' }));

        if (title) {
          doc.addElement(createText(width / 2, 40, title, {
            fontSize: 24, fontWeight: 'bold', fontFamily: 'Arial, sans-serif',
            textAnchor: 'middle', fill: '#ffffff', id: 'title'
          }));
        }

        const padding = { top: title ? 80 : 50, bottom: 50, left: 50, right: 50 };
        const chartHeight = height - padding.top - padding.bottom;
        const layerHeight = chartHeight / layers.length;
        const layerColors = ['#e94560', '#0f3460', '#533483', '#16a085', '#f39c12'];

        // 컴포넌트 위치 저장
        const componentPositions: Map<string, { x: number; y: number }> = new Map();

        layers.forEach((layer, layerIdx) => {
          const layerY = padding.top + layerIdx * layerHeight;
          const layerColor = layer.color || layerColors[layerIdx % layerColors.length];

          // 레이어 배경 (3D 효과)
          const depth = 20;
          doc.addRawElement(`
            <polygon points="${padding.left + depth},${layerY}
                            ${width - padding.right + depth},${layerY}
                            ${width - padding.right},${layerY + depth}
                            ${width - padding.right},${layerY + layerHeight - 10}
                            ${padding.left},${layerY + layerHeight - 10}
                            ${padding.left},${layerY + depth}"
                     fill="${layerColor}" opacity="0.15" id="layer-bg-${layerIdx}" />
            <line x1="${padding.left}" y1="${layerY + depth}" x2="${width - padding.right}" y2="${layerY + depth}"
                  stroke="${layerColor}" stroke-width="2" opacity="0.5" />
          `);

          // 레이어 이름
          doc.addElement(createText(padding.left + 10, layerY + depth + 20, layer.name, {
            fontSize: 14, fontWeight: 'bold', fontFamily: 'Arial, sans-serif',
            fill: layerColor, opacity: 0.9, id: `layer-name-${layerIdx}`
          }));

          // 컴포넌트 배치
          const compCount = layer.components.length;
          const compWidth = (width - padding.left - padding.right - 100) / compCount;
          const compY = layerY + layerHeight / 2 + 10;

          layer.components.forEach((comp, compIdx) => {
            const compX = padding.left + 80 + compIdx * compWidth + compWidth / 2;
            componentPositions.set(comp.id, { x: compX, y: compY });

            // 컴포넌트 박스 (글로우 효과)
            const boxWidth = 80;
            const boxHeight = 50;
            doc.addElement(createRect(compX - boxWidth / 2, compY - boxHeight / 2, boxWidth, boxHeight, {
              fill: layerColor, rx: 8, id: `comp-${comp.id}`
            }));

            // 아이콘 심볼 (간단한 텍스트 대체)
            const iconMap: Record<string, string> = {
              server: '🖥️', database: '🗄️', cloud: '☁️', container: '📦',
              api: '⚡', web: '🌐', mobile: '📱', storage: '💾'
            };
            const icon = iconMap[comp.icon || 'server'] || '📦';

            doc.addElement(createText(compX, compY - 5, icon, {
              fontSize: 18, textAnchor: 'middle', id: `comp-icon-${comp.id}`
            }));
            doc.addElement(createText(compX, compY + 15, comp.label, {
              fontSize: 10, fontFamily: 'Arial, sans-serif', fontWeight: 'bold',
              textAnchor: 'middle', fill: '#ffffff', id: `comp-label-${comp.id}`
            }));
          });
        });

        // 연결선
        if (connections) {
          doc.addDefs(`
            <marker id="arch-arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#4ecca3" />
            </marker>
          `);

          connections.forEach((conn, i) => {
            const fromPos = componentPositions.get(conn.from);
            const toPos = componentPositions.get(conn.to);
            if (!fromPos || !toPos) return;

            const isDown = toPos.y > fromPos.y;
            const y1 = isDown ? fromPos.y + 25 : fromPos.y - 25;
            const y2 = isDown ? toPos.y - 25 : toPos.y + 25;

            // 곡선 연결
            const ctrlY = (y1 + y2) / 2;
            doc.addRawElement(`
              <path d="M ${fromPos.x} ${y1} C ${fromPos.x} ${ctrlY} ${toPos.x} ${ctrlY} ${toPos.x} ${y2}"
                    fill="none" stroke="#4ecca3" stroke-width="2" opacity="0.7"
                    marker-end="url(#arch-arrow)" filter="url(#glow)" id="arch-conn-${i}" />
            `);

            if (conn.label) {
              const midY = (y1 + y2) / 2;
              const midX = (fromPos.x + toPos.x) / 2;
              doc.addElement(createText(midX + 5, midY, conn.label, {
                fontSize: 9, fontFamily: 'Arial, sans-serif', fill: '#4ecca3', opacity: 0.8
              }));
            }
          });
        }

        const totalComponents = layers.reduce((sum, l) => sum + l.components.length, 0);
        getHistoryManager().record('diagram_3d_architecture', `3D 아키텍처 생성: ${layers.length}개 레이어, ${totalComponents}개 컴포넌트`, doc.toJSON());

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: '3D 인프라 아키텍처 다이어그램이 생성되었습니다.',
              diagram: {
                type: '3d_architecture',
                layerCount: layers.length,
                componentCount: totalComponents,
                connectionCount: connections?.length || 0
              }
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ success: false, error: error instanceof Error ? error.message : '다이어그램 생성 실패' }) }],
          isError: true
        };
      }
    }
  );
}

/**
 * 색상 밝기 조절 헬퍼
 */
function adjustColor(color: string, amount: number): string {
  let hex = color.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }

  const r = Math.max(0, Math.min(255, parseInt(hex.slice(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.slice(2, 4), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.slice(4, 6), 16) + amount));

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
