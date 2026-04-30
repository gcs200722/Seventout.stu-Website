import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import { CmsBlockEntity } from './entities/cms-block.entity';
import { CmsPageEntity } from './entities/cms-page.entity';
import { CmsSectionEntity } from './entities/cms-section.entity';
import {
  assertBlockType,
  assertLayoutOrAppearanceJson,
  assertSectionType,
  validateAndNormalizeBlockData,
} from './cms-block-data';
import { QUEUE_PORT } from '../../core/queue/queue.constants';
import type { QueuePort } from '../../core/queue/queue.port';
import { CmsRepository } from './cms.repository';
import { CMS_JOB_SCHEDULED_PUBLISH } from './cms.constants';
import { CMS_PUBLISHED_CACHE_PORT } from './cms-published-cache.port';
import type { CmsPublishedCachePort } from './cms-published-cache.port';
import { TenantContextService } from '../../core/context/tenant-context.service';

export type CmsPublishedBlockJson = {
  id: string;
  type: string;
  data: Record<string, unknown>;
  appearance: Record<string, unknown>;
  sort_order: number;
  is_active: boolean;
};

export type CmsPublishedSectionJson = {
  id: string;
  type: string;
  title: string;
  layout: Record<string, unknown>;
  targeting: Record<string, unknown>;
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
  theme: {
    id: string;
    slug: string;
    name: string;
    tokens: Record<string, string>;
  } | null;
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
    private readonly jwtService: JwtService,
    @Inject(QUEUE_PORT)
    private readonly queuePort: QueuePort,
    private readonly configService: ConfigService,
    private readonly tenantContext: TenantContextService,
  ) {
    this.cacheTtlSeconds = this.configService.get<number>(
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
      theme: page.theme
        ? {
            id: page.theme.id,
            slug: page.theme.slug,
            name: page.theme.name,
            tokens:
              page.theme.tokens &&
              typeof page.theme.tokens === 'object' &&
              !Array.isArray(page.theme.tokens)
                ? page.theme.tokens
                : {},
          }
        : null,
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
      layout:
        section.layout && typeof section.layout === 'object'
          ? section.layout
          : {},
      targeting:
        section.targeting && typeof section.targeting === 'object'
          ? section.targeting
          : {},
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
      appearance:
        block.appearance && typeof block.appearance === 'object'
          ? block.appearance
          : {},
      sort_order: block.sortOrder,
      is_active: block.isActive,
    };
  }

  async getPublishedPageByKey(
    pageKey: string,
    _host?: string,
  ): Promise<CmsPublishedPageJson> {
    const tenantId = this.tenantContext.requireTenantId();
    const scopedPageKey = `${tenantId}:${pageKey}`;
    const cached = await this.publishedCache.getSerialized(scopedPageKey);
    if (cached) {
      try {
        return JSON.parse(cached) as CmsPublishedPageJson;
      } catch {
        await this.publishedCache.invalidate(scopedPageKey);
      }
    }

    const page = await this.cmsRepository.findPageTreeByKey(
      tenantId,
      pageKey,
      true,
    );
    if (!page || !page.isActive) {
      throw new NotFoundException({
        message: 'Page not found',
        details: { code: 'CMS_PAGE_NOT_FOUND', page_key: pageKey },
      });
    }

    const payload = this.serializePage(page);
    const json = JSON.stringify(payload);
    await this.publishedCache.setSerialized(
      scopedPageKey,
      json,
      this.cacheTtlSeconds,
    );
    return payload;
  }

  async listPagesAdmin(): Promise<CmsPublishedPageJson[]> {
    const tenantId = await this.tenantContext.requireTenantIdOrDefault();
    const pages = await this.cmsRepository.listPages(tenantId);
    const out: CmsPublishedPageJson[] = [];
    for (const p of pages) {
      const tree = await this.cmsRepository.findPageTreeById(
        tenantId,
        p.id,
        false,
      );
      if (tree) {
        out.push(this.serializePage(tree));
      }
    }
    return out;
  }

  async getPageAdmin(pageId: string): Promise<CmsPublishedPageJson> {
    const tenantId = await this.tenantContext.requireTenantIdOrDefault();
    const page = await this.cmsRepository.findPageTreeById(
      tenantId,
      pageId,
      false,
    );
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
    const tenantId = await this.tenantContext.requireTenantIdOrDefault();
    const existing = await this.cmsRepository.findPageByKey(
      tenantId,
      payload.page_key,
    );
    if (existing) {
      throw new BadRequestException({
        message: 'Page key already exists',
        details: { code: 'CMS_PAGE_KEY_DUPLICATE' },
      });
    }
    const page = await this.cmsRepository.createPage({
      tenantId,
      pageKey: payload.page_key,
      title: payload.title,
      isActive: payload.is_active,
    });
    const tree = await this.cmsRepository.findPageTreeById(
      tenantId,
      page.id,
      false,
    );
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
      layout?: Record<string, unknown>;
      targeting?: Record<string, unknown>;
    },
  ): Promise<CmsPublishedSectionJson> {
    const tenantId = await this.tenantContext.requireTenantIdOrDefault();
    const page = await this.cmsRepository.findPageById(tenantId, pageId);
    if (!page) {
      throw new NotFoundException({
        message: 'Page not found',
        details: { code: 'CMS_PAGE_NOT_FOUND' },
      });
    }
    assertSectionType(payload.type);
    const layout = assertLayoutOrAppearanceJson(payload.layout, 'layout');
    const targeting = assertLayoutOrAppearanceJson(
      payload.targeting,
      'targeting',
    );
    const section = await this.cmsRepository.createSection({
      tenantId,
      pageId,
      type: payload.type,
      title: payload.title,
      sortOrder: payload.sort_order,
      isActive: payload.is_active,
      layout,
      targeting,
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
      appearance?: Record<string, unknown>;
    },
  ): Promise<CmsPublishedBlockJson> {
    const tenantId = await this.tenantContext.requireTenantIdOrDefault();
    const meta = await this.cmsRepository.getSectionWithPage(sectionId);
    if (!meta) {
      throw new NotFoundException({
        message: 'Section not found',
        details: { code: 'CMS_SECTION_NOT_FOUND' },
      });
    }
    const blockType = assertBlockType(payload.type);
    const data = validateAndNormalizeBlockData(blockType, payload.data);
    const appearance = assertLayoutOrAppearanceJson(
      payload.appearance,
      'appearance',
    );
    const block = await this.cmsRepository.createBlock({
      tenantId,
      sectionId,
      type: blockType,
      data,
      sortOrder: payload.sort_order,
      isActive: payload.is_active,
      appearance,
    });
    await this.publishedCache.invalidate(meta.pageKey);
    return this.serializeBlock(block);
  }

  async reorderSections(
    pageId: string,
    section_ids: string[],
  ): Promise<CmsPublishedPageJson> {
    const tenantId = await this.tenantContext.requireTenantIdOrDefault();
    const page = await this.cmsRepository.findPageById(tenantId, pageId);
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
    const tree = await this.cmsRepository.findPageTreeById(
      tenantId,
      pageId,
      false,
    );
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
      layout?: Record<string, unknown>;
      targeting?: Record<string, unknown>;
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
    let layoutPatch: Record<string, unknown> | undefined;
    if (patch.layout !== undefined) {
      layoutPatch = assertLayoutOrAppearanceJson(patch.layout, 'layout');
    }
    let targetingPatch: Record<string, unknown> | undefined;
    if (patch.targeting !== undefined) {
      targetingPatch = assertLayoutOrAppearanceJson(
        patch.targeting,
        'targeting',
      );
    }
    const updated = await this.cmsRepository.updateSection(sectionId, {
      title: patch.title,
      type: patch.type,
      sortOrder: patch.sort_order,
      isActive: patch.is_active,
      layout: layoutPatch,
      targeting: targetingPatch,
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
      appearance?: Record<string, unknown>;
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
    let appearancePatch: Record<string, unknown> | undefined;
    if (patch.appearance !== undefined) {
      appearancePatch = assertLayoutOrAppearanceJson(
        patch.appearance,
        'appearance',
      );
    }

    const updated = await this.cmsRepository.updateBlock(blockId, {
      type: nextType,
      data: nextData,
      sortOrder: patch.sort_order,
      isActive: patch.is_active,
      appearance: appearancePatch,
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

  private static readonly PREVIEW_SCOPE = 'cms_preview';

  async mintCmsPreviewToken(
    pageId: string,
  ): Promise<{ token: string; expires_in_seconds: number }> {
    const page = await this.cmsRepository.findPageById(
      await this.tenantContext.requireTenantIdOrDefault(),
      pageId,
    );
    if (!page) {
      throw new NotFoundException({
        message: 'Page not found',
        details: { code: 'CMS_PAGE_NOT_FOUND' },
      });
    }
    const expiresInSeconds = 15 * 60;
    const token = await this.jwtService.signAsync({
      sub: CmsApplicationService.PREVIEW_SCOPE,
      pageId,
    });
    return { token, expires_in_seconds: expiresInSeconds };
  }

  async getPageByPreviewToken(token: string): Promise<CmsPublishedPageJson> {
    let pageId: string;
    try {
      const payload = await this.jwtService.verifyAsync<{
        sub?: string;
        pageId?: string;
      }>(token);
      if (
        payload.sub !== CmsApplicationService.PREVIEW_SCOPE ||
        typeof payload.pageId !== 'string'
      ) {
        throw new UnauthorizedException({
          message: 'Invalid preview token',
          details: { code: 'CMS_PREVIEW_INVALID' },
        });
      }
      pageId = payload.pageId;
    } catch {
      throw new UnauthorizedException({
        message: 'Invalid or expired preview token',
        details: { code: 'CMS_PREVIEW_INVALID' },
      });
    }
    return this.getPageAdmin(pageId);
  }

  async publishPageInvalidateCache(pageId: string): Promise<void> {
    const tenantId = await this.tenantContext.requireTenantIdOrDefault();
    const page = await this.cmsRepository.findPageById(tenantId, pageId);
    if (!page) {
      throw new NotFoundException({
        message: 'Page not found',
        details: { code: 'CMS_PAGE_NOT_FOUND' },
      });
    }
    await this.publishedCache.invalidate(`${tenantId}:${page.pageKey}`);
  }

  async reorderSectionBlocks(
    sectionId: string,
    block_ids: string[],
  ): Promise<CmsPublishedSectionJson> {
    const meta = await this.cmsRepository.getSectionWithPage(sectionId);
    if (!meta) {
      throw new NotFoundException({
        message: 'Section not found',
        details: { code: 'CMS_SECTION_NOT_FOUND' },
      });
    }
    const existing = await this.cmsRepository.listBlockIdsForSection(sectionId);
    if (block_ids.length !== existing.length) {
      throw new BadRequestException({
        message:
          'block_ids must include every block in the section exactly once',
        details: { code: 'CMS_BLOCK_REORDER_MISMATCH' },
      });
    }
    const setExisting = new Set(existing);
    if (new Set(block_ids).size !== block_ids.length) {
      throw new BadRequestException({
        message: 'block_ids must not contain duplicates',
        details: { code: 'CMS_BLOCK_REORDER_INVALID' },
      });
    }
    for (const id of block_ids) {
      if (!setExisting.has(id)) {
        throw new BadRequestException({
          message: 'block_ids contains unknown block id',
          details: { code: 'CMS_BLOCK_REORDER_INVALID' },
        });
      }
    }

    await this.dataSource.transaction(async () => {
      await this.cmsRepository.reorderBlocks(sectionId, block_ids);
    });

    await this.publishedCache.invalidate(meta.pageKey);
    const section = await this.cmsRepository.findSectionWithBlocks(sectionId);
    if (!section) {
      throw new NotFoundException({
        message: 'Section not found after reorder',
        details: { code: 'CMS_SECTION_NOT_FOUND' },
      });
    }
    return this.serializeSection(section);
  }

  async schedulePublishPage(
    pageId: string,
    runAtIso: string,
  ): Promise<{ scheduled: true; delay_ms: number }> {
    const page = await this.cmsRepository.findPageById(
      await this.tenantContext.requireTenantIdOrDefault(),
      pageId,
    );
    if (!page) {
      throw new NotFoundException({
        message: 'Page not found',
        details: { code: 'CMS_PAGE_NOT_FOUND' },
      });
    }
    const runAt = new Date(runAtIso);
    if (Number.isNaN(runAt.getTime())) {
      throw new BadRequestException({
        message: 'run_at must be a valid ISO-8601 datetime',
        details: { code: 'CMS_SCHEDULE_INVALID' },
      });
    }
    const delayMs = Math.max(0, runAt.getTime() - Date.now());
    const maxDelayMs = 30 * 24 * 60 * 60 * 1000;
    if (delayMs > maxDelayMs) {
      throw new BadRequestException({
        message: 'run_at must be within 30 days',
        details: { code: 'CMS_SCHEDULE_TOO_FAR' },
      });
    }
    await this.queuePort.enqueue(
      CMS_JOB_SCHEDULED_PUBLISH,
      { tenant_id: await this.tenantContext.requireTenantIdOrDefault(), page_id: pageId },
      {
        ...(delayMs > 0 ? { delayMs } : {}),
        attempts: 3,
        backoffMs: 2000,
      },
    );
    return { scheduled: true, delay_ms: delayMs };
  }
}
