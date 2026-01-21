/**
 * Preset Tools
 * OG 이미지 프리셋 생성기 - 플랫폼별 최적화된 이미지 사이즈 지원
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getCurrentDocument, createDocument } from '../core/document.js';
import { getLayerManager } from '../core/layer-manager.js';
import { getHistoryManager } from '../core/history-manager.js';
import { createRect, createText } from '../core/element.js';

// 플랫폼별 프리셋 정의
const PLATFORM_PRESETS = {
  og: { width: 1200, height: 630, name: 'Open Graph (Facebook, LinkedIn)' },
  naver_blog: { width: 800, height: 800, name: '네이버 블로그' },
  naver_search: { width: 1200, height: 630, name: '네이버 검색 (OG)' },
  twitter: { width: 1200, height: 600, name: 'Twitter/X Card' },
  youtube: { width: 1280, height: 720, name: 'YouTube 썸네일' },
  instagram: { width: 1080, height: 1080, name: 'Instagram 정사각형' },
  instagram_story: { width: 1080, height: 1920, name: 'Instagram 스토리' },
  tistory: { width: 1200, height: 630, name: '티스토리 (OG)' },
  pinterest: { width: 1000, height: 1500, name: 'Pinterest 핀' },
  linkedin: { width: 1200, height: 627, name: 'LinkedIn 배너' }
} as const;

type PlatformType = keyof typeof PLATFORM_PRESETS;

// 미리 정의된 테마
const THEMES = {
  modern: {
    background: '#ffffff',
    primary: '#2563eb',
    secondary: '#64748b',
    accent: '#f59e0b',
    text: '#1e293b'
  },
  dark: {
    background: '#1e1e2e',
    primary: '#89b4fa',
    secondary: '#a6adc8',
    accent: '#f38ba8',
    text: '#cdd6f4'
  },
  gradient_blue: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    primary: '#ffffff',
    secondary: '#e0e7ff',
    accent: '#fbbf24',
    text: '#ffffff'
  },
  gradient_sunset: {
    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    primary: '#ffffff',
    secondary: '#fce7f3',
    accent: '#fbbf24',
    text: '#ffffff'
  },
  minimal: {
    background: '#fafafa',
    primary: '#18181b',
    secondary: '#71717a',
    accent: '#ef4444',
    text: '#18181b'
  },
  nature: {
    background: '#ecfdf5',
    primary: '#059669',
    secondary: '#6b7280',
    accent: '#f59e0b',
    text: '#064e3b'
  }
} as const;

type ThemeType = keyof typeof THEMES;

/**
 * Preset Tools 등록
 */
export function registerPresetTools(server: McpServer): void {
  // preset_list: 사용 가능한 프리셋 목록
  server.tool(
    'preset_list',
    '사용 가능한 OG 이미지 프리셋 목록을 조회합니다.',
    {},
    async () => {
      const platforms = Object.entries(PLATFORM_PRESETS).map(([key, value]) => ({
        id: key,
        name: value.name,
        width: value.width,
        height: value.height,
        aspectRatio: `${value.width}:${value.height}`
      }));

      const themes = Object.entries(THEMES).map(([key, value]) => ({
        id: key,
        background: value.background,
        primary: value.primary,
        text: value.text
      }));

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            platforms,
            themes,
            usage: 'preset_create_og 도구로 원하는 플랫폼과 테마를 선택하여 이미지를 생성하세요.'
          }, null, 2)
        }]
      };
    }
  );

  // preset_create_og: 플랫폼별 OG 이미지 생성
  server.tool(
    'preset_create_og',
    '플랫폼별 최적화된 OG 이미지를 자동 생성합니다.',
    {
      platform: z.enum(['og', 'naver_blog', 'naver_search', 'twitter', 'youtube', 'instagram', 'instagram_story', 'tistory', 'pinterest', 'linkedin'])
        .describe('플랫폼 (og, naver_blog, twitter, youtube, instagram 등)'),
      title: z.string().describe('메인 타이틀'),
      subtitle: z.string().optional().describe('서브 타이틀 (선택)'),
      theme: z.enum(['modern', 'dark', 'gradient_blue', 'gradient_sunset', 'minimal', 'nature']).optional().default('modern')
        .describe('테마 (modern, dark, gradient_blue, gradient_sunset, minimal, nature)'),
      logoUrl: z.string().optional().describe('로고 이미지 URL (선택)'),
      backgroundImage: z.string().optional().describe('배경 이미지 URL (선택)'),
      showBorder: z.boolean().optional().default(false).describe('테두리 표시 여부'),
      customColors: z.object({
        background: z.string().optional(),
        primary: z.string().optional(),
        text: z.string().optional(),
        accent: z.string().optional()
      }).optional().describe('커스텀 색상 (선택)')
    },
    async ({ platform, title, subtitle, theme = 'modern', logoUrl, backgroundImage, showBorder, customColors }) => {
      try {
        const preset = PLATFORM_PRESETS[platform as PlatformType];
        const themeColors = THEMES[theme as ThemeType];

        // 커스텀 색상 병합 (타입 보장)
        const colors = {
          background: customColors?.background ?? themeColors.background,
          primary: customColors?.primary ?? themeColors.primary,
          secondary: themeColors.secondary,
          accent: customColors?.accent ?? themeColors.accent,
          text: customColors?.text ?? themeColors.text
        };

        // 새 문서 생성
        createDocument(preset.width, preset.height, colors.background);
        const doc = getCurrentDocument();

        // 그라디언트 배경 처리
        if (colors.background.startsWith('linear-gradient')) {
          // SVG defs에 그라디언트 추가
          const gradientMatch = colors.background.match(/linear-gradient\((\d+)deg,\s*([#\w]+)\s+\d+%,\s*([#\w]+)\s+\d+%\)/);
          if (gradientMatch) {
            const angle = parseInt(gradientMatch[1]);
            const color1 = gradientMatch[2];
            const color2 = gradientMatch[3];

            // 각도를 SVG 좌표로 변환
            const rad = (angle - 90) * Math.PI / 180;
            const x1 = 50 - 50 * Math.cos(rad);
            const y1 = 50 - 50 * Math.sin(rad);
            const x2 = 50 + 50 * Math.cos(rad);
            const y2 = 50 + 50 * Math.sin(rad);

            doc.addDefs(`
              <linearGradient id="bg-gradient" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">
                <stop offset="0%" style="stop-color:${color1}" />
                <stop offset="100%" style="stop-color:${color2}" />
              </linearGradient>
            `);

            // 그라디언트 배경 사각형
            const bgRect = createRect(0, 0, preset.width, preset.height, {
              fill: 'url(#bg-gradient)',
              id: 'background'
            });
            doc.addElement(bgRect);
          }
        } else {
          // 단색 배경
          const bgRect = createRect(0, 0, preset.width, preset.height, {
            fill: colors.background,
            id: 'background'
          });
          doc.addElement(bgRect);
        }

        // 배경 이미지 (선택적)
        if (backgroundImage) {
          doc.addRawElement(`
            <image href="${backgroundImage}" x="0" y="0" width="${preset.width}" height="${preset.height}"
                   preserveAspectRatio="xMidYMid slice" opacity="0.3" />
          `);
        }

        // 테두리 (선택적)
        if (showBorder) {
          const borderRect = createRect(10, 10, preset.width - 20, preset.height - 20, {
            fill: 'none',
            stroke: colors.primary,
            strokeWidth: 4,
            id: 'border'
          });
          doc.addElement(borderRect);
        }

        // 로고 (선택적)
        if (logoUrl) {
          const logoSize = Math.min(preset.width, preset.height) * 0.15;
          doc.addRawElement(`
            <image href="${logoUrl}" x="${preset.width - logoSize - 40}" y="40"
                   width="${logoSize}" height="${logoSize}" preserveAspectRatio="xMidYMid meet" />
          `);
        }

        // 타이틀 계산
        const titleFontSize = Math.min(preset.width * 0.08, 72);
        const subtitleFontSize = titleFontSize * 0.5;
        const centerY = preset.height / 2;

        // 메인 타이틀
        const titleElement = createText(preset.width / 2, centerY - (subtitle ? subtitleFontSize : 0), title, {
          fontFamily: 'Arial, sans-serif',
          fontSize: titleFontSize,
          fontWeight: 'bold',
          textAnchor: 'middle',
          fill: colors.text,
          id: 'title'
        });
        doc.addElement(titleElement);

        // 서브 타이틀 (선택적)
        if (subtitle) {
          const subtitleElement = createText(preset.width / 2, centerY + titleFontSize * 0.7, subtitle, {
            fontFamily: 'Arial, sans-serif',
            fontSize: subtitleFontSize,
            fontWeight: 'normal',
            textAnchor: 'middle',
            fill: colors.secondary || colors.text,
            opacity: 0.8,
            id: 'subtitle'
          });
          doc.addElement(subtitleElement);
        }

        // 히스토리에 기록
        getHistoryManager().record(
          'preset_create_og',
          `OG 이미지 생성: ${preset.name}`,
          doc.toJSON()
        );

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `${preset.name} 프리셋으로 OG 이미지가 생성되었습니다.`,
              canvas: {
                width: preset.width,
                height: preset.height,
                platform: platform,
                theme: theme
              },
              elements: {
                background: true,
                border: showBorder,
                logo: !!logoUrl,
                backgroundImage: !!backgroundImage,
                title: title,
                subtitle: subtitle || null
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
              error: error instanceof Error ? error.message : 'OG 이미지 생성에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );

  // preset_create_thumbnail: 빠른 썸네일 생성
  server.tool(
    'preset_create_thumbnail',
    '빠른 블로그 썸네일을 생성합니다. (간소화된 버전)',
    {
      title: z.string().describe('타이틀 텍스트'),
      backgroundColor: z.string().optional().default('#2563eb').describe('배경색'),
      textColor: z.string().optional().default('#ffffff').describe('텍스트 색상'),
      size: z.enum(['small', 'medium', 'large']).optional().default('medium')
        .describe('크기 (small: 600x400, medium: 800x600, large: 1200x800)')
    },
    async ({ title, backgroundColor, textColor, size }) => {
      try {
        const sizes = {
          small: { width: 600, height: 400 },
          medium: { width: 800, height: 600 },
          large: { width: 1200, height: 800 }
        };

        const { width, height } = sizes[size];

        createDocument(width, height, backgroundColor);
        const doc = getCurrentDocument();

        // 배경
        const bgRect = createRect(0, 0, width, height, {
          fill: backgroundColor,
          id: 'background'
        });
        doc.addElement(bgRect);

        // 장식 요소 (원)
        doc.addRawElement(`
          <circle cx="${width * 0.85}" cy="${height * 0.15}" r="${height * 0.2}"
                  fill="${textColor}" opacity="0.1" />
          <circle cx="${width * 0.1}" cy="${height * 0.9}" r="${height * 0.15}"
                  fill="${textColor}" opacity="0.1" />
        `);

        // 타이틀
        const fontSize = Math.min(width * 0.08, 64);
        const titleElement = createText(width / 2, height / 2, title, {
          fontFamily: 'Arial, sans-serif',
          fontSize: fontSize,
          fontWeight: 'bold',
          textAnchor: 'middle',
          fill: textColor,
          id: 'title'
        });
        doc.addElement(titleElement);

        getHistoryManager().record(
          'preset_create_thumbnail',
          `썸네일 생성: ${title}`,
          doc.toJSON()
        );

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: '썸네일이 생성되었습니다.',
              canvas: { width, height },
              style: { backgroundColor, textColor }
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : '썸네일 생성에 실패했습니다.'
            })
          }],
          isError: true
        };
      }
    }
  );
}
