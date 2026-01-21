/**
 * 템플릿 관리자
 * SVG 템플릿 저장, 로드, 관리
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { Template } from '../types/index.js';
import { generateUUID } from './id-generator.js';

// 기본 템플릿 디렉토리
const DEFAULT_TEMPLATE_DIR = process.env.TEMPLATE_DIR ||
  path.join(process.env.HOME || '', '.claude', 'mcp-servers', 'svg-canvas', 'templates');

/**
 * 템플릿 관리자 클래스
 */
export class TemplateManager {
  private templateDir: string;
  private templates: Map<string, Template> = new Map();
  private loaded: boolean = false;

  constructor(templateDir?: string) {
    this.templateDir = templateDir || DEFAULT_TEMPLATE_DIR;
  }

  /**
   * 템플릿 디렉토리 초기화
   */
  private async ensureDir(): Promise<void> {
    try {
      await fs.mkdir(this.templateDir, { recursive: true });
      await fs.mkdir(path.join(this.templateDir, 'icons'), { recursive: true });
      await fs.mkdir(path.join(this.templateDir, 'shapes'), { recursive: true });
      await fs.mkdir(path.join(this.templateDir, 'layouts'), { recursive: true });
    } catch (error) {
      // 이미 존재하면 무시
    }
  }

  /**
   * 모든 템플릿 로드
   */
  async loadTemplates(): Promise<void> {
    if (this.loaded) return;

    await this.ensureDir();
    this.templates.clear();

    const categories = ['icons', 'shapes', 'layouts'];

    for (const category of categories) {
      const categoryDir = path.join(this.templateDir, category);

      try {
        const files = await fs.readdir(categoryDir);

        for (const file of files) {
          if (!file.endsWith('.json')) continue;

          const filePath = path.join(categoryDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const template: Template = JSON.parse(content);
          template.category = category;
          this.templates.set(template.id, template);
        }
      } catch (error) {
        // 디렉토리가 비어있거나 없으면 무시
      }
    }

    this.loaded = true;
  }

  /**
   * 템플릿 저장
   */
  async saveTemplate(
    name: string,
    content: string,
    options: {
      description?: string;
      tags?: string[];
      category?: string;
      width?: number;
      height?: number;
    } = {}
  ): Promise<Template> {
    await this.ensureDir();

    const template: Template = {
      id: generateUUID('template'),
      name,
      description: options.description || '',
      tags: options.tags || [],
      category: options.category || 'shapes',
      content,
      metadata: {
        width: options.width || 100,
        height: options.height || 100,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    };

    const fileName = `${template.id}.json`;
    const filePath = path.join(this.templateDir, template.category, fileName);

    await fs.writeFile(filePath, JSON.stringify(template, null, 2), 'utf-8');
    this.templates.set(template.id, template);

    return template;
  }

  /**
   * 템플릿 로드
   */
  async getTemplate(templateId: string): Promise<Template | null> {
    if (!this.loaded) {
      await this.loadTemplates();
    }

    return this.templates.get(templateId) || null;
  }

  /**
   * 이름으로 템플릿 검색
   */
  async findTemplateByName(name: string): Promise<Template | null> {
    if (!this.loaded) {
      await this.loadTemplates();
    }

    for (const template of this.templates.values()) {
      if (template.name.toLowerCase() === name.toLowerCase()) {
        return template;
      }
    }

    return null;
  }

  /**
   * 템플릿 목록 조회
   */
  async listTemplates(options: {
    category?: string;
    tags?: string[];
    search?: string;
  } = {}): Promise<Template[]> {
    if (!this.loaded) {
      await this.loadTemplates();
    }

    let templates = Array.from(this.templates.values());

    // 카테고리 필터
    if (options.category) {
      templates = templates.filter(t => t.category === options.category);
    }

    // 태그 필터
    if (options.tags && options.tags.length > 0) {
      templates = templates.filter(t =>
        options.tags!.some(tag => t.tags.includes(tag))
      );
    }

    // 검색어 필터
    if (options.search) {
      const search = options.search.toLowerCase();
      templates = templates.filter(t =>
        t.name.toLowerCase().includes(search) ||
        t.description.toLowerCase().includes(search) ||
        t.tags.some(tag => tag.toLowerCase().includes(search))
      );
    }

    return templates;
  }

  /**
   * 템플릿 삭제
   */
  async deleteTemplate(templateId: string): Promise<boolean> {
    const template = this.templates.get(templateId);
    if (!template) return false;

    const fileName = `${templateId}.json`;
    const filePath = path.join(this.templateDir, template.category, fileName);

    try {
      await fs.unlink(filePath);
      this.templates.delete(templateId);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 템플릿 업데이트
   */
  async updateTemplate(templateId: string, updates: Partial<Template>): Promise<Template | null> {
    const template = this.templates.get(templateId);
    if (!template) return null;

    // 업데이트 적용
    const updated: Template = {
      ...template,
      ...updates,
      id: template.id, // ID는 변경 불가
      metadata: {
        ...template.metadata,
        ...updates.metadata,
        updatedAt: new Date()
      }
    };

    const fileName = `${templateId}.json`;
    const filePath = path.join(this.templateDir, template.category, fileName);

    await fs.writeFile(filePath, JSON.stringify(updated, null, 2), 'utf-8');
    this.templates.set(templateId, updated);

    return updated;
  }

  /**
   * 기본 템플릿 생성
   */
  async createDefaultTemplates(): Promise<void> {
    // 기본 아이콘 템플릿
    const defaultIcons = [
      {
        name: 'Home',
        content: '<path d="M12 2L2 12h3v9h6v-6h2v6h6v-9h3L12 2z" fill="currentColor"/>',
        tags: ['icon', 'navigation', 'home'],
        width: 24,
        height: 24
      },
      {
        name: 'Star',
        content: '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor"/>',
        tags: ['icon', 'rating', 'star'],
        width: 24,
        height: 24
      },
      {
        name: 'Heart',
        content: '<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor"/>',
        tags: ['icon', 'love', 'heart'],
        width: 24,
        height: 24
      }
    ];

    for (const icon of defaultIcons) {
      const existing = await this.findTemplateByName(icon.name);
      if (!existing) {
        await this.saveTemplate(icon.name, icon.content, {
          tags: icon.tags,
          category: 'icons',
          width: icon.width,
          height: icon.height
        });
      }
    }

    // 기본 도형 템플릿
    const defaultShapes = [
      {
        name: 'Rounded Rectangle',
        content: '<rect x="10" y="10" width="80" height="60" rx="10" ry="10" fill="#3498db"/>',
        tags: ['shape', 'rectangle', 'rounded'],
        width: 100,
        height: 80
      },
      {
        name: 'Circle Badge',
        content: '<circle cx="50" cy="50" r="40" fill="#e74c3c"/><text x="50" y="55" text-anchor="middle" fill="white" font-size="24">1</text>',
        tags: ['shape', 'badge', 'circle'],
        width: 100,
        height: 100
      }
    ];

    for (const shape of defaultShapes) {
      const existing = await this.findTemplateByName(shape.name);
      if (!existing) {
        await this.saveTemplate(shape.name, shape.content, {
          tags: shape.tags,
          category: 'shapes',
          width: shape.width,
          height: shape.height
        });
      }
    }
  }

  /**
   * 템플릿 개수
   */
  getCount(): number {
    return this.templates.size;
  }

  /**
   * 카테고리별 개수
   */
  async getCountByCategory(): Promise<Record<string, number>> {
    if (!this.loaded) {
      await this.loadTemplates();
    }

    const counts: Record<string, number> = {};
    for (const template of this.templates.values()) {
      counts[template.category] = (counts[template.category] || 0) + 1;
    }
    return counts;
  }
}

// 싱글톤 인스턴스
let currentTemplateManager: TemplateManager | null = null;

/**
 * 현재 템플릿 매니저 가져오기
 */
export function getTemplateManager(): TemplateManager {
  if (!currentTemplateManager) {
    currentTemplateManager = new TemplateManager();
  }
  return currentTemplateManager;
}

/**
 * 템플릿 매니저 초기화
 */
export function resetTemplateManager(): void {
  currentTemplateManager = null;
}
