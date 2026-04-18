import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { CmsBlockEntity } from './entities/cms-block.entity';
import { CmsPageEntity } from './entities/cms-page.entity';
import { CmsSectionEntity } from './entities/cms-section.entity';
import {
  assertBlockType,
  assertSectionType,
  validateAndNormalizeBlockData,
} from './cms-block-data';
import { CmsRepository } from './cms.repository';
import { CMS_PUBLISHED_CACHE_PORT } from './cms-published-cache.port';
import type { CmsPublishedCachePort } from './cms-published-cache.port';

export type CmsPublishedBlockJson = {
  id: string;
  type: string;
  data: Record<string, unknown>;
  sort_order: number;
  is_active: boolean;
};

export type CmsPublishedSectionJson = {
  id: string;
  type: string;
  title: string;
  sort_order: number;
  is_active: boolean;
  blocks: CmsPublishedBlockJson[];
};

export type CmsPublishedPageJson = {
  id: string;
  key: string;
  title: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  sections: CmsPublishedSectionJson[];
};

@Injectable()
export class CmsApplicationService {
  private readonly cacheTtlSeconds: number;

  constructor(
    private readonly cmsRepository: CmsRepository,
    @Inject(CMS_PUBLISHED_CACHE_PORT)
    private readonly publishedCache: CmsPublishedCachePort,
    private readonly dataSource: DataSource,
    configService: ConfigService,
  ) {
    this.cacheTtlSeconds = configService.get<number>(
      'CMS_CACHE_TTL_SECONDS',
      600,
    );
  }

  private serializePage(page: CmsPageEntity): CmsPublishedPageJson {
    const sections = [...(page.sections ?? [])].sort(
      (a, b) => a.sortOrder - b.sortOrder,
    );
    return {
      id: page.id,
      key: page.pageKey,
      title: page.title,
      is_active: page.isActive,
      created_at: page.createdAt.toISOString(),
      updated_at: page.updatedAt.toISOString(),
      sections: sections.map((s) => this.serializeSection(s)),
    };
  }

  private serializeSection(section: CmsSectionEntity): CmsPublishedSectionJson {
    const blocks = [...(section.blocks ?? [])].sort(
      (a, b) => a.sortOrder - b.sortOrder,
    );
    return {
      id: section.id,
      type: section.type,
      title: section.title,
      sort_order: section.sortOrder,
      is_active: section.isActive,
      blocks: blocks.map((b) => this.serializeBlock(b)),
    };
  }

  private serializeBlock(block: CmsBlockEntity): CmsPublishedBlockJson {
    return {
      id: block.id,
      type: block.type,
      data: block.data,
      sort_order: block.sortOrder,
      is_active: block.isActive,
    };
  }

  async getPublishedPageByKey(pageKey: string): Promise<CmsPublishedPageJson> {
    const cached = await this.publishedCache.getSerialized(pageKey);
    if (cached) {
      try {
        return JSON.parse(cached) as CmsPublishedPageJson;
      } catch {
        await this.publishedCache.invalidate(pageKey);
      }
    }

    const page = await this.cmsRepository.findPageTreeByKey(pageKey, true);
    if (!page || !page.isActive) {
      throw new NotFoundException({
        message: 'Page not found',
        details: { code: 'CMS_PAGE_NOT_FOUND', page_key: pageKey },
      });
    }

    const payload = this.serializePage(page);
    const json = JSON.stringify(payload);
    await this.publishedCache.setSerialized(
      pageKey,
      json,
      this.cacheTtlSeconds,
    );
    return payload;
  }

  async listPagesAdmin(): Promise<CmsPublishedPageJson[]> {
    const pages = await this.cmsRepository.listPages();
    const out: CmsPublishedPageJson[] = [];
    for (const p of pages) {
      const tree = await this.cmsRepository.findPageTreeById(p.id, false);
      if (tree) {
        out.push(this.serializePage(tree));
      }
    }
    return out;
  }

  async getPageAdmin(pageId: string): Promise<CmsPublishedPageJson> {
    const page = await this.cmsRepository.findPageTreeById(pageId, false);
    if (!page) {
      throw new NotFoundException({
        message: 'Page not found',
        details: { code: 'CMS_PAGE_NOT_FOUND' },
      });
    }
    return this.serializePage(page);
  }

  async createPage(payload: {
    page_key: string;
    title: string;
    is_active?: boolean;
  }): Promise<CmsPublishedPageJson> {
    const existing = await this.cmsRepository.findPageByKey(payload.page_key);
    if (existing) {
      throw new BadRequestException({
        message: 'Page key already exists',
        details: { code: 'CMS_PAGE_KEY_DUPLICATE' },
      });
    }
    const page = await this.cmsRepository.createPage({
      pageKey: payload.page_key,
      title: payload.title,
      isActive: payload.is_active,
    });
    const tree = await this.cmsRepository.findPageTreeById(page.id, false);
    if (!tree) {
      throw new NotFoundException('Page not found after create');
    }
    return this.serializePage(tree);
  }

  async addSection(
    pageId: string,
    payload: {
      type: string;
      title: string;
      sort_order?: number;
      is_active?: boolean;
    },
  ): Promise<CmsPublishedSectionJson> {
    const page = await this.cmsRepository.findPageById(pageId);
    if (!page) {
      throw new NotFoundException({
        message: 'Page not found',
        details: { code: 'CMS_PAGE_NOT_FOUND' },
      });
    }
    assertSectionType(payload.type);
    const section = await this.cmsRepository.createSection({
      pageId,
      type: payload.type,
      title: payload.title,
      sortOrder: payload.sort_order,
      isActive: payload.is_active,
    });
    await this.publishedCache.invalidate(page.pageKey);
    return this.serializeSection(section);
  }

  async addBlock(
    sectionId: string,
    payload: {
      type: string;
      data: Record<string, unknown>;
      sort_order?: number;
      is_active?: boolean;
    },
  ): Promise<CmsPublishedBlockJson> {
    const meta = await this.cmsRepository.getSectionWithPage(sectionId);
    if (!meta) {
      throw new NotFoundException({
        message: 'Section not found',
        details: { code: 'CMS_SECTION_NOT_FOUND' },
      });
    }
    const blockType = assertBlockType(payload.type);
    const data = validateAndNormalizeBlockData(blockType, payload.data);
    const block = await this.cmsRepository.createBlock({
      sectionId,
      type: blockType,
      data,
      sortOrder: payload.sort_order,
      isActive: payload.is_active,
    });
    await this.publishedCache.invalidate(meta.pageKey);
    return this.serializeBlock(block);
  }

  async reorderSections(
    pageId: string,
    section_ids: string[],
  ): Promise<CmsPublishedPageJson> {
    const page = await this.cmsRepository.findPageById(pageId);
    if (!page) {
      throw new NotFoundException({
        message: 'Page not found',
        details: { code: 'CMS_PAGE_NOT_FOUND' },
      });
    }
    const existing = await this.cmsRepository.listSectionIdsForPage(pageId);
    if (section_ids.length !== existing.length) {
      throw new BadRequestException({
        message:
          'section_ids must include every section on the page exactly once',
        details: { code: 'CMS_SECTION_REORDER_MISMATCH' },
      });
    }
    const setExisting = new Set(existing);
    const uniqIncoming = new Set(section_ids);
    if (uniqIncoming.size !== section_ids.length) {
      throw new BadRequestException({
        message: 'section_ids must not contain duplicates',
        details: { code: 'CMS_SECTION_REORDER_INVALID' },
      });
    }
    for (const id of section_ids) {
      if (!setExisting.has(id)) {
        throw new BadRequestException({
          message: 'section_ids contains unknown section id',
          details: { code: 'CMS_SECTION_REORDER_INVALID' },
        });
      }
    }

    await this.dataSource.transaction(async () => {
      await this.cmsRepository.reorderSections(pageId, section_ids);
    });

    await this.publishedCache.invalidate(page.pageKey);
    const tree = await this.cmsRepository.findPageTreeById(pageId, false);
    if (!tree) {
      throw new NotFoundException('Page not found after reorder');
    }
    return this.serializePage(tree);
  }

  async updateSection(
    sectionId: string,
    patch: {
      title?: string;
      type?: string;
      sort_order?: number;
      is_active?: boolean;
    },
  ): Promise<CmsPublishedSectionJson> {
    const meta = await this.cmsRepository.getSectionWithPage(sectionId);
    if (!meta) {
      throw new NotFoundException({
        message: 'Section not found',
        details: { code: 'CMS_SECTION_NOT_FOUND' },
      });
    }
    if (patch.type !== undefined) {
      assertSectionType(patch.type);
    }
    const updated = await this.cmsRepository.updateSection(sectionId, {
      title: patch.title,
      type: patch.type,
      sortOrder: patch.sort_order,
      isActive: patch.is_active,
    });
    if (!updated) {
      throw new NotFoundException({
        message: 'Section not found',
        details: { code: 'CMS_SECTION_NOT_FOUND' },
      });
    }
    await this.publishedCache.invalidate(meta.pageKey);
    return this.serializeSection(updated);
  }

  async updateBlock(
    blockId: string,
    patch: {
      type?: string;
      data?: Record<string, unknown>;
      sort_order?: number;
      is_active?: boolean;
    },
  ): Promise<CmsPublishedBlockJson> {
    const meta = await this.cmsRepository.getBlockWithPageKey(blockId);
    if (!meta) {
      throw new NotFoundException({
        message: 'Block not found',
        details: { code: 'CMS_BLOCK_NOT_FOUND' },
      });
    }
    const nextType = patch.type
      ? assertBlockType(patch.type)
      : assertBlockType(meta.block.type);
    let nextData = meta.block.data;
    if (patch.data !== undefined) {
      nextData = validateAndNormalizeBlockData(nextType, patch.data);
    } else if (patch.type !== undefined) {
      nextData = validateAndNormalizeBlockData(nextType, meta.block.data);
    }

    const updated = await this.cmsRepository.updateBlock(blockId, {
      type: nextType,
      data: nextData,
      sortOrder: patch.sort_order,
      isActive: patch.is_active,
    });
    if (!updated) {
      throw new NotFoundException({
        message: 'Block not found',
        details: { code: 'CMS_BLOCK_NOT_FOUND' },
      });
    }
    await this.publishedCache.invalidate(meta.pageKey);
    return this.serializeBlock(updated);
  }

  async deleteSection(sectionId: string): Promise<void> {
    const meta = await this.cmsRepository.getSectionWithPage(sectionId);
    if (!meta) {
      throw new NotFoundException({
        message: 'Section not found',
        details: { code: 'CMS_SECTION_NOT_FOUND' },
      });
    }
    await this.cmsRepository.softDeleteSection(sectionId);
    await this.publishedCache.invalidate(meta.pageKey);
  }

  async deleteBlock(blockId: string): Promise<void> {
    const meta = await this.cmsRepository.getBlockWithPageKey(blockId);
    if (!meta) {
      throw new NotFoundException({
        message: 'Block not found',
        details: { code: 'CMS_BLOCK_NOT_FOUND' },
      });
    }
    await this.cmsRepository.softDeleteBlock(blockId);
    await this.publishedCache.invalidate(meta.pageKey);
  }
}
