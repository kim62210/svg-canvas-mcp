/**
 * Chart Tools
 * 2D/3D 차트 생성 도구 - 막대, 선, 파이, 도넛 차트 등 지원
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getCurrentDocument, createDocument } from '../core/document.js';
import { getLayerManager } from '../core/layer-manager.js';
import { getHistoryManager } from '../core/history-manager.js';
import { createRect, createText, createLine, createCircle } from '../core/element.js';

// 기본 색상 팔레트
const DEFAULT_COLORS = [
  '#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6',
  '#1abc9c', '#e67e22', '#34495e', '#16a085', '#d35400'
];

// 차트 데이터 스키마
const chartDataSchema = z.array(z.object({
  label: z.string().describe('항목 라벨'),
  value: z.number().describe('항목 값'),
  color: z.string().optional().describe('항목 색상 (선택)')
})).min(1);

// 공통 차트 옵션
const commonChartOptions = {
  title: z.string().optional().describe('차트 제목'),
  width: z.number().optional().default(600).describe('차트 너비'),
  height: z.number().optional().default(400).describe('차트 높이'),
  colors: z.array(z.string()).optional().describe('색상 배열 (선택)'),
  showLegend: z.boolean().optional().default(true).describe('범례 표시 여부'),
  showValues: z.boolean().optional().default(true).describe('값 표시 여부'),
  backgroundColor: z.string().optional().default('#ffffff').describe('배경색')
};

/**
 * 범례 생성 헬퍼
 */
function createLegend(
  doc: any,
  data: Array<{ label: string; value: number; color?: string }>,
  colors: string[],
  x: number,
  y: number,
  itemHeight: number = 25
): void {
  data.forEach((item, i) => {
    const color = item.color || colors[i % colors.length];
    const itemY = y + i * itemHeight;

    // 색상 박스
    const colorBox = createRect(x, itemY, 15, 15, {
      fill: color,
      id: `legend-box-${i}`
    });
    doc.addElement(colorBox);

    // 라벨
    const label = createText(x + 22, itemY + 12, item.label, {
      fontSize: 12,
      fontFamily: 'Arial, sans-serif',
      fill: '#333333',
      id: `legend-label-${i}`
    });
    doc.addElement(label);
  });
}

/**
 * Chart Tools 등록
 */
export function registerChartTools(server: McpServer): void {
  // chart_bar: 막대 차트
  server.tool(
    'chart_bar',
    '막대 차트를 생성합니다.',
    {
      data: chartDataSchema.describe('차트 데이터 [{label, value, color?}, ...]'),
      orientation: z.enum(['vertical', 'horizontal']).optional().default('vertical').describe('방향'),
      barWidth: z.number().optional().describe('막대 너비 (자동 계산)'),
      gap: z.number().optional().default(10).describe('막대 사이 간격'),
      ...commonChartOptions
    },
    async ({ data, orientation, barWidth, gap, title, width, height, colors, showLegend, showValues, backgroundColor }) => {
      try {
        const chartColors = colors || DEFAULT_COLORS;
        const padding = { top: title ? 60 : 30, right: showLegend ? 150 : 30, bottom: 60, left: 60 };

        createDocument(width, height, backgroundColor);
        const doc = getCurrentDocument();

        // 배경
        doc.addElement(createRect(0, 0, width, height, { fill: backgroundColor, id: 'bg' }));

        // 제목
        if (title) {
          doc.addElement(createText(width / 2, 30, title, {
            fontSize: 18,
            fontWeight: 'bold',
            fontFamily: 'Arial, sans-serif',
            textAnchor: 'middle',
            fill: '#333333',
            id: 'title'
          }));
        }

        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;
        const maxValue = Math.max(...data.map(d => d.value));

        if (orientation === 'vertical') {
          const calculatedBarWidth = barWidth || (chartWidth - gap * (data.length + 1)) / data.length;

          data.forEach((item, i) => {
            const color = item.color || chartColors[i % chartColors.length];
            const barHeight = (item.value / maxValue) * chartHeight;
            const x = padding.left + gap + i * (calculatedBarWidth + gap);
            const y = padding.top + chartHeight - barHeight;

            // 막대
            doc.addElement(createRect(x, y, calculatedBarWidth, barHeight, {
              fill: color,
              id: `bar-${i}`
            }));

            // 값 표시
            if (showValues) {
              doc.addElement(createText(x + calculatedBarWidth / 2, y - 5, item.value.toString(), {
                fontSize: 11,
                fontFamily: 'Arial, sans-serif',
                textAnchor: 'middle',
                fill: '#333333',
                id: `value-${i}`
              }));
            }

            // X축 라벨
            doc.addElement(createText(x + calculatedBarWidth / 2, height - padding.bottom + 20, item.label, {
              fontSize: 11,
              fontFamily: 'Arial, sans-serif',
              textAnchor: 'middle',
              fill: '#666666',
              id: `label-${i}`
            }));
          });

          // Y축 그리드 라인
          for (let i = 0; i <= 5; i++) {
            const y = padding.top + (chartHeight / 5) * i;
            const value = Math.round(maxValue - (maxValue / 5) * i);
            doc.addElement(createLine(padding.left, y, padding.left + chartWidth, y, {
              stroke: '#eeeeee',
              strokeWidth: 1,
              id: `grid-${i}`
            }));
            doc.addElement(createText(padding.left - 10, y + 4, value.toString(), {
              fontSize: 10,
              fontFamily: 'Arial, sans-serif',
              textAnchor: 'end',
              fill: '#666666',
              id: `y-label-${i}`
            }));
          }
        } else {
          // 가로 막대 차트
          const calculatedBarWidth = barWidth || (chartHeight - gap * (data.length + 1)) / data.length;

          data.forEach((item, i) => {
            const color = item.color || chartColors[i % chartColors.length];
            const barLength = (item.value / maxValue) * chartWidth;
            const y = padding.top + gap + i * (calculatedBarWidth + gap);

            // 막대
            doc.addElement(createRect(padding.left, y, barLength, calculatedBarWidth, {
              fill: color,
              id: `bar-${i}`
            }));

            // 값 표시
            if (showValues) {
              doc.addElement(createText(padding.left + barLength + 5, y + calculatedBarWidth / 2 + 4, item.value.toString(), {
                fontSize: 11,
                fontFamily: 'Arial, sans-serif',
                fill: '#333333',
                id: `value-${i}`
              }));
            }

            // Y축 라벨
            doc.addElement(createText(padding.left - 10, y + calculatedBarWidth / 2 + 4, item.label, {
              fontSize: 11,
              fontFamily: 'Arial, sans-serif',
              textAnchor: 'end',
              fill: '#666666',
              id: `label-${i}`
            }));
          });
        }

        // 범례
        if (showLegend) {
          createLegend(doc, data, chartColors, width - padding.right + 20, padding.top);
        }

        getHistoryManager().record('chart_bar', `막대 차트 생성: ${data.length}개 항목`, doc.toJSON());

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: '막대 차트가 생성되었습니다.',
              chart: { type: 'bar', orientation, dataCount: data.length, width, height }
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ success: false, error: error instanceof Error ? error.message : '차트 생성 실패' }) }],
          isError: true
        };
      }
    }
  );

  // chart_line: 선 차트
  server.tool(
    'chart_line',
    '선 차트를 생성합니다.',
    {
      data: chartDataSchema.describe('차트 데이터'),
      showDots: z.boolean().optional().default(true).describe('데이터 포인트 표시'),
      lineWidth: z.number().optional().default(2).describe('선 두께'),
      curved: z.boolean().optional().default(false).describe('곡선으로 표시'),
      fillArea: z.boolean().optional().default(false).describe('영역 채우기'),
      ...commonChartOptions
    },
    async ({ data, showDots, lineWidth, curved, fillArea, title, width, height, colors, showLegend, showValues, backgroundColor }) => {
      try {
        const chartColors = colors || DEFAULT_COLORS;
        const padding = { top: title ? 60 : 30, right: showLegend ? 150 : 30, bottom: 60, left: 60 };

        createDocument(width, height, backgroundColor);
        const doc = getCurrentDocument();

        doc.addElement(createRect(0, 0, width, height, { fill: backgroundColor, id: 'bg' }));

        if (title) {
          doc.addElement(createText(width / 2, 30, title, {
            fontSize: 18, fontWeight: 'bold', fontFamily: 'Arial, sans-serif',
            textAnchor: 'middle', fill: '#333333', id: 'title'
          }));
        }

        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;
        const maxValue = Math.max(...data.map(d => d.value));
        const stepX = chartWidth / (data.length - 1);
        const color = chartColors[0];

        // 포인트 계산
        const points = data.map((item, i) => ({
          x: padding.left + i * stepX,
          y: padding.top + chartHeight - (item.value / maxValue) * chartHeight,
          value: item.value,
          label: item.label
        }));

        // 영역 채우기
        if (fillArea) {
          const areaPath = `M ${points[0].x} ${padding.top + chartHeight} ` +
            points.map(p => `L ${p.x} ${p.y}`).join(' ') +
            ` L ${points[points.length - 1].x} ${padding.top + chartHeight} Z`;
          doc.addRawElement(`<path d="${areaPath}" fill="${color}" opacity="0.2" id="area" />`);
        }

        // 선 그리기
        let linePath: string;
        if (curved) {
          // 베지어 곡선
          linePath = `M ${points[0].x} ${points[0].y}`;
          for (let i = 1; i < points.length; i++) {
            const prev = points[i - 1];
            const curr = points[i];
            const cpx = (prev.x + curr.x) / 2;
            linePath += ` Q ${cpx} ${prev.y} ${cpx} ${(prev.y + curr.y) / 2}`;
            linePath += ` Q ${cpx} ${curr.y} ${curr.x} ${curr.y}`;
          }
        } else {
          linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
        }
        doc.addRawElement(`<path d="${linePath}" fill="none" stroke="${color}" stroke-width="${lineWidth}" id="line" />`);

        // 데이터 포인트
        if (showDots) {
          points.forEach((p, i) => {
            doc.addElement(createCircle(p.x, p.y, 5, {
              fill: color, stroke: '#ffffff', strokeWidth: 2, id: `dot-${i}`
            }));
          });
        }

        // 값 표시
        if (showValues) {
          points.forEach((p, i) => {
            doc.addElement(createText(p.x, p.y - 12, p.value.toString(), {
              fontSize: 10, fontFamily: 'Arial, sans-serif', textAnchor: 'middle',
              fill: '#333333', id: `value-${i}`
            }));
          });
        }

        // X축 라벨
        points.forEach((p, i) => {
          doc.addElement(createText(p.x, height - padding.bottom + 20, p.label, {
            fontSize: 11, fontFamily: 'Arial, sans-serif', textAnchor: 'middle',
            fill: '#666666', id: `label-${i}`
          }));
        });

        // Y축 그리드
        for (let i = 0; i <= 5; i++) {
          const y = padding.top + (chartHeight / 5) * i;
          const value = Math.round(maxValue - (maxValue / 5) * i);
          doc.addElement(createLine(padding.left, y, padding.left + chartWidth, y, {
            stroke: '#eeeeee', strokeWidth: 1, id: `grid-${i}`
          }));
          doc.addElement(createText(padding.left - 10, y + 4, value.toString(), {
            fontSize: 10, fontFamily: 'Arial, sans-serif', textAnchor: 'end',
            fill: '#666666', id: `y-label-${i}`
          }));
        }

        getHistoryManager().record('chart_line', `선 차트 생성: ${data.length}개 포인트`, doc.toJSON());

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: '선 차트가 생성되었습니다.',
              chart: { type: 'line', curved, fillArea, dataCount: data.length }
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ success: false, error: error instanceof Error ? error.message : '차트 생성 실패' }) }],
          isError: true
        };
      }
    }
  );

  // chart_pie: 파이 차트
  server.tool(
    'chart_pie',
    '파이 차트를 생성합니다.',
    {
      data: chartDataSchema.describe('차트 데이터'),
      innerRadius: z.number().optional().default(0).describe('내부 반지름 (도넛 차트용, 0이면 파이)'),
      startAngle: z.number().optional().default(-90).describe('시작 각도 (기본: -90도 = 12시 방향)'),
      ...commonChartOptions
    },
    async ({ data, innerRadius, startAngle, title, width, height, colors, showLegend, showValues, backgroundColor }) => {
      try {
        const chartColors = colors || DEFAULT_COLORS;
        const padding = { top: title ? 60 : 30, right: showLegend ? 180 : 30, bottom: 30, left: 30 };

        createDocument(width, height, backgroundColor);
        const doc = getCurrentDocument();

        doc.addElement(createRect(0, 0, width, height, { fill: backgroundColor, id: 'bg' }));

        if (title) {
          doc.addElement(createText(width / 2, 30, title, {
            fontSize: 18, fontWeight: 'bold', fontFamily: 'Arial, sans-serif',
            textAnchor: 'middle', fill: '#333333', id: 'title'
          }));
        }

        const chartArea = {
          width: width - padding.left - padding.right,
          height: height - padding.top - padding.bottom
        };
        const centerX = padding.left + chartArea.width / 2;
        const centerY = padding.top + chartArea.height / 2;
        const radius = Math.min(chartArea.width, chartArea.height) / 2 - 10;

        const total = data.reduce((sum, d) => sum + d.value, 0);
        let currentAngle = startAngle;

        data.forEach((item, i) => {
          const color = item.color || chartColors[i % chartColors.length];
          const sliceAngle = (item.value / total) * 360;
          const endAngle = currentAngle + sliceAngle;

          // 파이 조각 경로
          const startRad = (currentAngle * Math.PI) / 180;
          const endRad = (endAngle * Math.PI) / 180;

          const x1 = centerX + radius * Math.cos(startRad);
          const y1 = centerY + radius * Math.sin(startRad);
          const x2 = centerX + radius * Math.cos(endRad);
          const y2 = centerY + radius * Math.sin(endRad);

          const largeArc = sliceAngle > 180 ? 1 : 0;

          let pathD: string;
          if (innerRadius > 0) {
            // 도넛
            const ix1 = centerX + innerRadius * Math.cos(startRad);
            const iy1 = centerY + innerRadius * Math.sin(startRad);
            const ix2 = centerX + innerRadius * Math.cos(endRad);
            const iy2 = centerY + innerRadius * Math.sin(endRad);

            pathD = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} ` +
                    `L ${ix2} ${iy2} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix1} ${iy1} Z`;
          } else {
            // 파이
            pathD = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
          }

          doc.addRawElement(`<path d="${pathD}" fill="${color}" stroke="#ffffff" stroke-width="2" id="slice-${i}" />`);

          // 값/퍼센트 표시
          if (showValues) {
            const midAngle = (currentAngle + sliceAngle / 2) * Math.PI / 180;
            const labelRadius = innerRadius > 0 ? (radius + innerRadius) / 2 : radius * 0.65;
            const labelX = centerX + labelRadius * Math.cos(midAngle);
            const labelY = centerY + labelRadius * Math.sin(midAngle);
            const percent = Math.round((item.value / total) * 100);

            doc.addElement(createText(labelX, labelY, `${percent}%`, {
              fontSize: 12, fontWeight: 'bold', fontFamily: 'Arial, sans-serif',
              textAnchor: 'middle', fill: '#ffffff', id: `percent-${i}`
            }));
          }

          currentAngle = endAngle;
        });

        // 범례
        if (showLegend) {
          data.forEach((item, i) => {
            const color = item.color || chartColors[i % chartColors.length];
            const legendY = padding.top + i * 28;
            const percent = Math.round((item.value / total) * 100);

            doc.addElement(createRect(width - padding.right + 20, legendY, 16, 16, {
              fill: color, id: `legend-box-${i}`
            }));
            doc.addElement(createText(width - padding.right + 42, legendY + 13, `${item.label} (${percent}%)`, {
              fontSize: 12, fontFamily: 'Arial, sans-serif', fill: '#333333', id: `legend-label-${i}`
            }));
          });
        }

        getHistoryManager().record('chart_pie', `파이 차트 생성: ${data.length}개 항목`, doc.toJSON());

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: innerRadius > 0 ? '도넛 차트가 생성되었습니다.' : '파이 차트가 생성되었습니다.',
              chart: { type: innerRadius > 0 ? 'donut' : 'pie', dataCount: data.length, total }
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ success: false, error: error instanceof Error ? error.message : '차트 생성 실패' }) }],
          isError: true
        };
      }
    }
  );

  // chart_donut: 도넛 차트 (파이 차트의 편의 래퍼)
  server.tool(
    'chart_donut',
    '도넛 차트를 생성합니다.',
    {
      data: chartDataSchema.describe('차트 데이터'),
      thickness: z.number().optional().default(40).describe('도넛 두께'),
      ...commonChartOptions
    },
    async ({ data, thickness, title, width, height, colors, showLegend, showValues, backgroundColor }) => {
      try {
        const chartColors = colors || DEFAULT_COLORS;
        const padding = { top: title ? 60 : 30, right: showLegend ? 180 : 30, bottom: 30, left: 30 };

        createDocument(width, height, backgroundColor);
        const doc = getCurrentDocument();

        doc.addElement(createRect(0, 0, width, height, { fill: backgroundColor, id: 'bg' }));

        if (title) {
          doc.addElement(createText(width / 2, 30, title, {
            fontSize: 18, fontWeight: 'bold', fontFamily: 'Arial, sans-serif',
            textAnchor: 'middle', fill: '#333333', id: 'title'
          }));
        }

        const chartArea = { width: width - padding.left - padding.right, height: height - padding.top - padding.bottom };
        const centerX = padding.left + chartArea.width / 2;
        const centerY = padding.top + chartArea.height / 2;
        const radius = Math.min(chartArea.width, chartArea.height) / 2 - 10;
        const innerRadius = radius - thickness;

        const total = data.reduce((sum, d) => sum + d.value, 0);
        let currentAngle = -90;

        data.forEach((item, i) => {
          const color = item.color || chartColors[i % chartColors.length];
          const sliceAngle = (item.value / total) * 360;
          const endAngle = currentAngle + sliceAngle;

          const startRad = (currentAngle * Math.PI) / 180;
          const endRad = (endAngle * Math.PI) / 180;

          const x1 = centerX + radius * Math.cos(startRad);
          const y1 = centerY + radius * Math.sin(startRad);
          const x2 = centerX + radius * Math.cos(endRad);
          const y2 = centerY + radius * Math.sin(endRad);
          const ix1 = centerX + innerRadius * Math.cos(startRad);
          const iy1 = centerY + innerRadius * Math.sin(startRad);
          const ix2 = centerX + innerRadius * Math.cos(endRad);
          const iy2 = centerY + innerRadius * Math.sin(endRad);

          const largeArc = sliceAngle > 180 ? 1 : 0;
          const pathD = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} ` +
                        `L ${ix2} ${iy2} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix1} ${iy1} Z`;

          doc.addRawElement(`<path d="${pathD}" fill="${color}" stroke="#ffffff" stroke-width="2" id="slice-${i}" />`);

          currentAngle = endAngle;
        });

        // 중앙 총합 표시
        doc.addElement(createText(centerX, centerY - 5, '총합', {
          fontSize: 12, fontFamily: 'Arial, sans-serif', textAnchor: 'middle', fill: '#666666', id: 'total-label'
        }));
        doc.addElement(createText(centerX, centerY + 15, total.toLocaleString(), {
          fontSize: 24, fontWeight: 'bold', fontFamily: 'Arial, sans-serif', textAnchor: 'middle', fill: '#333333', id: 'total-value'
        }));

        // 범례
        if (showLegend) {
          data.forEach((item, i) => {
            const color = item.color || chartColors[i % chartColors.length];
            const legendY = padding.top + i * 28;
            const percent = Math.round((item.value / total) * 100);

            doc.addElement(createRect(width - padding.right + 20, legendY, 16, 16, { fill: color, id: `legend-box-${i}` }));
            doc.addElement(createText(width - padding.right + 42, legendY + 13, `${item.label} (${percent}%)`, {
              fontSize: 12, fontFamily: 'Arial, sans-serif', fill: '#333333', id: `legend-label-${i}`
            }));
          });
        }

        getHistoryManager().record('chart_donut', `도넛 차트 생성: ${data.length}개 항목`, doc.toJSON());

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: '도넛 차트가 생성되었습니다.',
              chart: { type: 'donut', thickness, dataCount: data.length, total }
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ success: false, error: error instanceof Error ? error.message : '차트 생성 실패' }) }],
          isError: true
        };
      }
    }
  );

  // chart_3d_bar: 3D 막대 차트
  server.tool(
    'chart_3d_bar',
    '3D 막대 차트를 생성합니다.',
    {
      data: chartDataSchema.describe('차트 데이터'),
      depth: z.number().optional().default(30).describe('3D 깊이'),
      angle: z.number().optional().default(45).describe('3D 각도 (도)'),
      ...commonChartOptions
    },
    async ({ data, depth, angle, title, width, height, colors, showLegend, showValues, backgroundColor }) => {
      try {
        const chartColors = colors || DEFAULT_COLORS;
        const padding = { top: title ? 70 : 40, right: showLegend ? 150 : 40, bottom: 60, left: 60 };

        createDocument(width, height, backgroundColor);
        const doc = getCurrentDocument();

        doc.addElement(createRect(0, 0, width, height, { fill: backgroundColor, id: 'bg' }));

        if (title) {
          doc.addElement(createText(width / 2, 30, title, {
            fontSize: 18, fontWeight: 'bold', fontFamily: 'Arial, sans-serif',
            textAnchor: 'middle', fill: '#333333', id: 'title'
          }));
        }

        const chartWidth = width - padding.left - padding.right - depth;
        const chartHeight = height - padding.top - padding.bottom - depth;
        const maxValue = Math.max(...data.map(d => d.value));
        const gap = 15;
        const barWidth = (chartWidth - gap * (data.length + 1)) / data.length;

        // 3D 오프셋 계산
        const angleRad = (angle * Math.PI) / 180;
        const offsetX = depth * Math.cos(angleRad);
        const offsetY = depth * Math.sin(angleRad);

        // 바닥면 (3D 효과)
        doc.addRawElement(`
          <polygon points="${padding.left},${padding.top + chartHeight}
                          ${padding.left + chartWidth},${padding.top + chartHeight}
                          ${padding.left + chartWidth + offsetX},${padding.top + chartHeight - offsetY}
                          ${padding.left + offsetX},${padding.top + chartHeight - offsetY}"
                   fill="#e0e0e0" stroke="#cccccc" stroke-width="1" id="floor" />
        `);

        data.forEach((item, i) => {
          const baseColor = item.color || chartColors[i % chartColors.length];
          const barHeight = (item.value / maxValue) * chartHeight;
          const x = padding.left + gap + i * (barWidth + gap);
          const y = padding.top + chartHeight - barHeight;

          // 어둡고 밝은 색상 계산
          const darkerColor = adjustColor(baseColor, -30);
          const lighterColor = adjustColor(baseColor, 20);

          // 전면
          doc.addElement(createRect(x, y, barWidth, barHeight, {
            fill: baseColor, id: `bar-front-${i}`
          }));

          // 상단면 (3D)
          doc.addRawElement(`
            <polygon points="${x},${y} ${x + barWidth},${y}
                            ${x + barWidth + offsetX},${y - offsetY} ${x + offsetX},${y - offsetY}"
                     fill="${lighterColor}" stroke="${baseColor}" stroke-width="0.5" id="bar-top-${i}" />
          `);

          // 측면 (3D)
          doc.addRawElement(`
            <polygon points="${x + barWidth},${y} ${x + barWidth + offsetX},${y - offsetY}
                            ${x + barWidth + offsetX},${y + barHeight - offsetY} ${x + barWidth},${y + barHeight}"
                     fill="${darkerColor}" stroke="${baseColor}" stroke-width="0.5" id="bar-side-${i}" />
          `);

          // 값 표시
          if (showValues) {
            doc.addElement(createText(x + barWidth / 2 + offsetX / 2, y - offsetY - 8, item.value.toString(), {
              fontSize: 11, fontWeight: 'bold', fontFamily: 'Arial, sans-serif',
              textAnchor: 'middle', fill: '#333333', id: `value-${i}`
            }));
          }

          // X축 라벨
          doc.addElement(createText(x + barWidth / 2, height - padding.bottom + 20, item.label, {
            fontSize: 11, fontFamily: 'Arial, sans-serif', textAnchor: 'middle',
            fill: '#666666', id: `label-${i}`
          }));
        });

        // 범례
        if (showLegend) {
          createLegend(doc, data, chartColors, width - padding.right + 20, padding.top);
        }

        getHistoryManager().record('chart_3d_bar', `3D 막대 차트 생성: ${data.length}개 항목`, doc.toJSON());

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: '3D 막대 차트가 생성되었습니다.',
              chart: { type: '3d_bar', depth, angle, dataCount: data.length }
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ success: false, error: error instanceof Error ? error.message : '차트 생성 실패' }) }],
          isError: true
        };
      }
    }
  );

  // chart_3d_pie: 3D 파이 차트
  server.tool(
    'chart_3d_pie',
    '3D 파이 차트를 생성합니다.',
    {
      data: chartDataSchema.describe('차트 데이터'),
      tilt: z.number().optional().default(60).describe('기울기 각도 (30-80)'),
      depth: z.number().optional().default(30).describe('3D 깊이'),
      ...commonChartOptions
    },
    async ({ data, tilt, depth, title, width, height, colors, showLegend, showValues, backgroundColor }) => {
      try {
        const chartColors = colors || DEFAULT_COLORS;
        const padding = { top: title ? 60 : 30, right: showLegend ? 180 : 30, bottom: 30 + depth, left: 30 };

        createDocument(width, height, backgroundColor);
        const doc = getCurrentDocument();

        doc.addElement(createRect(0, 0, width, height, { fill: backgroundColor, id: 'bg' }));

        if (title) {
          doc.addElement(createText(width / 2, 30, title, {
            fontSize: 18, fontWeight: 'bold', fontFamily: 'Arial, sans-serif',
            textAnchor: 'middle', fill: '#333333', id: 'title'
          }));
        }

        const chartArea = { width: width - padding.left - padding.right, height: height - padding.top - padding.bottom };
        const centerX = padding.left + chartArea.width / 2;
        const centerY = padding.top + chartArea.height / 2 - depth / 2;
        const radiusX = Math.min(chartArea.width, chartArea.height) / 2 - 10;
        const radiusY = radiusX * (tilt / 100); // 타원 효과

        const total = data.reduce((sum, d) => sum + d.value, 0);
        let currentAngle = -90;

        // 측면 먼저 그리기 (아래쪽 조각들)
        data.forEach((item, i) => {
          const baseColor = item.color || chartColors[i % chartColors.length];
          const sliceAngle = (item.value / total) * 360;
          const endAngle = currentAngle + sliceAngle;

          // 180도 이하 조각만 측면 표시 (앞쪽에 보이는 부분)
          if (currentAngle < 90 || endAngle > 270 || (currentAngle >= -90 && endAngle <= 90)) {
            const darkerColor = adjustColor(baseColor, -40);
            const startRad = Math.max(currentAngle, -90) * Math.PI / 180;
            const endRad = Math.min(endAngle, 90) * Math.PI / 180;

            if (startRad < endRad) {
              // 측면 경로
              const x1 = centerX + radiusX * Math.cos(startRad);
              const y1 = centerY + radiusY * Math.sin(startRad);
              const x2 = centerX + radiusX * Math.cos(endRad);
              const y2 = centerY + radiusY * Math.sin(endRad);

              const largeArc = (endRad - startRad) > Math.PI ? 1 : 0;

              doc.addRawElement(`
                <path d="M ${x1} ${y1} A ${radiusX} ${radiusY} 0 ${largeArc} 1 ${x2} ${y2}
                         L ${x2} ${y2 + depth} A ${radiusX} ${radiusY} 0 ${largeArc} 0 ${x1} ${y1 + depth} Z"
                      fill="${darkerColor}" stroke="${baseColor}" stroke-width="0.5" id="side-${i}" />
              `);
            }
          }

          currentAngle = endAngle;
        });

        // 상단면 (파이 조각)
        currentAngle = -90;
        data.forEach((item, i) => {
          const color = item.color || chartColors[i % chartColors.length];
          const sliceAngle = (item.value / total) * 360;
          const endAngle = currentAngle + sliceAngle;

          const startRad = currentAngle * Math.PI / 180;
          const endRad = endAngle * Math.PI / 180;

          const x1 = centerX + radiusX * Math.cos(startRad);
          const y1 = centerY + radiusY * Math.sin(startRad);
          const x2 = centerX + radiusX * Math.cos(endRad);
          const y2 = centerY + radiusY * Math.sin(endRad);

          const largeArc = sliceAngle > 180 ? 1 : 0;
          const pathD = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radiusX} ${radiusY} 0 ${largeArc} 1 ${x2} ${y2} Z`;

          doc.addRawElement(`<path d="${pathD}" fill="${color}" stroke="#ffffff" stroke-width="2" id="slice-${i}" />`);

          // 값 표시
          if (showValues) {
            const midAngle = (currentAngle + sliceAngle / 2) * Math.PI / 180;
            const labelX = centerX + radiusX * 0.6 * Math.cos(midAngle);
            const labelY = centerY + radiusY * 0.6 * Math.sin(midAngle);
            const percent = Math.round((item.value / total) * 100);

            doc.addElement(createText(labelX, labelY + 4, `${percent}%`, {
              fontSize: 11, fontWeight: 'bold', fontFamily: 'Arial, sans-serif',
              textAnchor: 'middle', fill: '#ffffff', id: `percent-${i}`
            }));
          }

          currentAngle = endAngle;
        });

        // 범례
        if (showLegend) {
          data.forEach((item, i) => {
            const color = item.color || chartColors[i % chartColors.length];
            const legendY = padding.top + i * 28;
            const percent = Math.round((item.value / total) * 100);

            doc.addElement(createRect(width - padding.right + 20, legendY, 16, 16, { fill: color, id: `legend-box-${i}` }));
            doc.addElement(createText(width - padding.right + 42, legendY + 13, `${item.label} (${percent}%)`, {
              fontSize: 12, fontFamily: 'Arial, sans-serif', fill: '#333333', id: `legend-label-${i}`
            }));
          });
        }

        getHistoryManager().record('chart_3d_pie', `3D 파이 차트 생성: ${data.length}개 항목`, doc.toJSON());

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: '3D 파이 차트가 생성되었습니다.',
              chart: { type: '3d_pie', tilt, depth, dataCount: data.length, total }
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ success: false, error: error instanceof Error ? error.message : '차트 생성 실패' }) }],
          isError: true
        };
      }
    }
  );

  // chart_3d_pyramid: 3D 피라미드 차트
  server.tool(
    'chart_3d_pyramid',
    '3D 피라미드 차트를 생성합니다.',
    {
      data: chartDataSchema.describe('차트 데이터 (위에서 아래로)'),
      ...commonChartOptions
    },
    async ({ data, title, width, height, colors, showLegend, showValues, backgroundColor }) => {
      try {
        const chartColors = colors || DEFAULT_COLORS;
        const padding = { top: title ? 60 : 30, right: showLegend ? 180 : 30, bottom: 30, left: 30 };

        createDocument(width, height, backgroundColor);
        const doc = getCurrentDocument();

        doc.addElement(createRect(0, 0, width, height, { fill: backgroundColor, id: 'bg' }));

        if (title) {
          doc.addElement(createText(width / 2, 30, title, {
            fontSize: 18, fontWeight: 'bold', fontFamily: 'Arial, sans-serif',
            textAnchor: 'middle', fill: '#333333', id: 'title'
          }));
        }

        const chartArea = { width: width - padding.left - padding.right, height: height - padding.top - padding.bottom };
        const centerX = padding.left + chartArea.width / 2;
        const pyramidHeight = chartArea.height * 0.9;
        const baseWidth = chartArea.width * 0.7;
        const topY = padding.top + chartArea.height * 0.05;

        const total = data.reduce((sum, d) => sum + d.value, 0);
        let currentY = topY;

        data.forEach((item, i) => {
          const color = item.color || chartColors[i % chartColors.length];
          const darkerColor = adjustColor(color, -25);
          const segmentHeight = (item.value / total) * pyramidHeight;
          const nextY = currentY + segmentHeight;

          // 현재 위치와 다음 위치에서의 너비 계산 (상단이 좁음)
          const topRatio = (currentY - topY) / pyramidHeight;
          const bottomRatio = (nextY - topY) / pyramidHeight;
          const topWidth = baseWidth * topRatio;
          const bottomWidth = baseWidth * bottomRatio;

          // 왼쪽 면
          doc.addRawElement(`
            <polygon points="${centerX - topWidth / 2},${currentY}
                            ${centerX},${currentY}
                            ${centerX},${nextY}
                            ${centerX - bottomWidth / 2},${nextY}"
                     fill="${color}" stroke="#ffffff" stroke-width="1" id="left-${i}" />
          `);

          // 오른쪽 면 (약간 어둡게)
          doc.addRawElement(`
            <polygon points="${centerX},${currentY}
                            ${centerX + topWidth / 2},${currentY}
                            ${centerX + bottomWidth / 2},${nextY}
                            ${centerX},${nextY}"
                     fill="${darkerColor}" stroke="#ffffff" stroke-width="1" id="right-${i}" />
          `);

          // 값 표시
          if (showValues) {
            const labelY = currentY + segmentHeight / 2 + 4;
            const percent = Math.round((item.value / total) * 100);
            doc.addElement(createText(centerX, labelY, `${percent}%`, {
              fontSize: 12, fontWeight: 'bold', fontFamily: 'Arial, sans-serif',
              textAnchor: 'middle', fill: '#ffffff', id: `value-${i}`
            }));
          }

          currentY = nextY;
        });

        // 범례
        if (showLegend) {
          data.forEach((item, i) => {
            const color = item.color || chartColors[i % chartColors.length];
            const legendY = padding.top + i * 28;

            doc.addElement(createRect(width - padding.right + 20, legendY, 16, 16, { fill: color, id: `legend-box-${i}` }));
            doc.addElement(createText(width - padding.right + 42, legendY + 13, item.label, {
              fontSize: 12, fontFamily: 'Arial, sans-serif', fill: '#333333', id: `legend-label-${i}`
            }));
          });
        }

        getHistoryManager().record('chart_3d_pyramid', `3D 피라미드 차트 생성: ${data.length}개 항목`, doc.toJSON());

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: '3D 피라미드 차트가 생성되었습니다.',
              chart: { type: '3d_pyramid', dataCount: data.length, total }
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ success: false, error: error instanceof Error ? error.message : '차트 생성 실패' }) }],
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
  // hex 색상 파싱
  let hex = color.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }

  const r = Math.max(0, Math.min(255, parseInt(hex.slice(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.slice(2, 4), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.slice(4, 6), 16) + amount));

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
