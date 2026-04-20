import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { CmsBlockEntity } from './entities/cms-block.entity';
import { CmsPageEntity } from './entities/cms-page.entity';
import { CmsSectionEntity } from './entities/cms-section.entity';

@Injectable()
export class CmsRepository {
  constructor(
    @InjectRepository(CmsPageEntity)
    private readonly pages: Repository<CmsPageEntity>,
    @InjectRepository(CmsSectionEntity)
    private readonly sections: Repository<CmsSectionEntity>,
    @InjectRepository(CmsBlockEntity)
    private readonly blocks: Repository<CmsBlockEntity>,
  ) {}

  async findPageByKey(pageKey: string): Promise<CmsPageEntity | null> {
    return this.pages.findOne({
      where: { pageKey },
    });
  }

  async findPageById(pageId: string): Promise<CmsPageEntity | null> {
    return this.pages.findOne({
      where: { id: pageId },
    });
  }

  async findPageTreeByKey(
    pageKey: string,
    activeOnly: boolean,
  ): Promise<CmsPageEntity | null> {
    const qb = this.pages
      .createQueryBuilder('page')
      .leftJoinAndSelect('page.theme', 'theme')
      .leftJoinAndSelect('page.sections', 'section')
      .leftJoinAndSelect('section.blocks', 'block')
      .where('page.page_key = :pageKey', { pageKey })
      .andWhere('page.deleted_at IS NULL')
      .andWhere('section.deleted_at IS NULL')
      .andWhere('block.deleted_at IS NULL')
      .orderBy('section.sort_order', 'ASC')
      .addOrderBy('block.sort_order', 'ASC');

    if (activeOnly) {
      qb.andWhere('page.is_active = true')
        .andWhere('section.is_active = true')
        .andWhere('block.is_active = true');
    }

    return qb.getOne();
  }

  async findPageTreeById(
    pageId: string,
    activeOnly: boolean,
  ): Promise<CmsPageEntity | null> {
    const qb = this.pages
      .createQueryBuilder('page')
      .leftJoinAndSelect('page.theme', 'theme')
      .leftJoinAndSelect('page.sections', 'section')
      .leftJoinAndSelect('section.blocks', 'block')
      .where('page.id = :pageId', { pageId })
      .andWhere('page.deleted_at IS NULL')
      .andWhere('section.deleted_at IS NULL')
      .andWhere('block.deleted_at IS NULL')
      .orderBy('section.sort_order', 'ASC')
      .addOrderBy('block.sort_order', 'ASC');

    if (activeOnly) {
      qb.andWhere('page.is_active = true')
        .andWhere('section.is_active = true')
        .andWhere('block.is_active = true');
    }

    return qb.getOne();
  }

  async listPages(): Promise<CmsPageEntity[]> {
    return this.pages.find({
      order: { pageKey: 'ASC' },
    });
  }

  async createPage(payload: {
    pageKey: string;
    title: string;
    isActive?: boolean;
  }): Promise<CmsPageEntity> {
    const entity = this.pages.create({
      pageKey: payload.pageKey,
      title: payload.title,
      isActive: payload.isActive ?? true,
    });
    return this.pages.save(entity);
  }

  async createSection(payload: {
    pageId: string;
    type: string;
    title: string;
    sortOrder?: number;
    isActive?: boolean;
    layout?: Record<string, unknown>;
    targeting?: Record<string, unknown>;
  }): Promise<CmsSectionEntity> {
    const entity = this.sections.create({
      pageId: payload.pageId,
      type: payload.type,
      title: payload.title,
      sortOrder: payload.sortOrder ?? 0,
      isActive: payload.isActive ?? true,
      layout: payload.layout ?? {},
      targeting: payload.targeting ?? {},
    });
    return this.sections.save(entity);
  }

  async createBlock(payload: {
    sectionId: string;
    type: string;
    data: Record<string, unknown>;
    sortOrder?: number;
    isActive?: boolean;
    appearance?: Record<string, unknown>;
  }): Promise<CmsBlockEntity> {
    const entity = this.blocks.create({
      sectionId: payload.sectionId,
      type: payload.type,
      data: payload.data,
      sortOrder: payload.sortOrder ?? 0,
      isActive: payload.isActive ?? true,
      appearance: payload.appearance ?? {},
    });
    return this.blocks.save(entity);
  }

  async updateSection(
    sectionId: string,
    patch: Partial<
      Pick<
        CmsSectionEntity,
        'title' | 'sortOrder' | 'isActive' | 'type' | 'layout' | 'targeting'
      >
    >,
  ): Promise<CmsSectionEntity | null> {
    const section = await this.sections.findOne({
      where: { id: sectionId },
    });
    if (!section) {
      return null;
    }
    if (patch.title !== undefined) section.title = patch.title;
    if (patch.sortOrder !== undefined) section.sortOrder = patch.sortOrder;
    if (patch.isActive !== undefined) section.isActive = patch.isActive;
    if (patch.type !== undefined) section.type = patch.type;
    if (patch.layout !== undefined) section.layout = patch.layout;
    if (patch.targeting !== undefined) section.targeting = patch.targeting;
    return this.sections.save(section);
  }

  async updateBlock(
    blockId: string,
    patch: Partial<
      Pick<
        CmsBlockEntity,
        'data' | 'sortOrder' | 'isActive' | 'type' | 'appearance'
      >
    >,
  ): Promise<CmsBlockEntity | null> {
    const block = await this.blocks.findOne({
      where: { id: blockId },
    });
    if (!block) {
      return null;
    }
    if (patch.data !== undefined) block.data = patch.data;
    if (patch.sortOrder !== undefined) block.sortOrder = patch.sortOrder;
    if (patch.isActive !== undefined) block.isActive = patch.isActive;
    if (patch.type !== undefined) block.type = patch.type;
    if (patch.appearance !== undefined) block.appearance = patch.appearance;
    return this.blocks.save(block);
  }

  async softDeleteSection(sectionId: string): Promise<boolean> {
    const res = await this.sections.softDelete({ id: sectionId });
    return (res.affected ?? 0) > 0;
  }

  async softDeleteBlock(blockId: string): Promise<boolean> {
    const res = await this.blocks.softDelete({ id: blockId });
    return (res.affected ?? 0) > 0;
  }

  async listSectionIdsForPage(pageId: string): Promise<string[]> {
    const rows = await this.sections.find({
      where: { pageId },
      select: ['id'],
      order: { sortOrder: 'ASC' },
    });
    return rows.map((r) => r.id);
  }

  async reorderSections(
    pageId: string,
    orderedSectionIds: string[],
  ): Promise<void> {
    for (let i = 0; i < orderedSectionIds.length; i += 1) {
      await this.sections.update(
        { id: orderedSectionIds[i], pageId, deletedAt: IsNull() },
        { sortOrder: (i + 1) * 10 },
      );
    }
  }

  async getSectionWithPage(
    sectionId: string,
  ): Promise<{ section: CmsSectionEntity; pageKey: string } | null> {
    const section = await this.sections.findOne({
      where: { id: sectionId },
      relations: { page: true },
    });
    if (!section?.page) {
      return null;
    }
    return { section, pageKey: section.page.pageKey };
  }

  async listBlockIdsForSection(sectionId: string): Promise<string[]> {
    const rows = await this.blocks.find({
      where: { sectionId, deletedAt: IsNull() },
      select: ['id'],
      order: { sortOrder: 'ASC' },
    });
    return rows.map((r) => r.id);
  }

  async reorderBlocks(
    sectionId: string,
    orderedBlockIds: string[],
  ): Promise<void> {
    for (let i = 0; i < orderedBlockIds.length; i += 1) {
      await this.blocks.update(
        { id: orderedBlockIds[i], sectionId, deletedAt: IsNull() },
        { sortOrder: (i + 1) * 10 },
      );
    }
  }

  async findSectionWithBlocks(
    sectionId: string,
  ): Promise<CmsSectionEntity | null> {
    return this.sections.findOne({
      where: { id: sectionId },
      relations: { blocks: true },
    });
  }

  async getBlockWithPageKey(
    blockId: string,
  ): Promise<{ block: CmsBlockEntity; pageKey: string } | null> {
    const block = await this.blocks.findOne({
      where: { id: blockId },
      relations: { section: { page: true } },
    });
    if (!block?.section?.page) {
      return null;
    }
    return { block, pageKey: block.section.page.pageKey };
  }
}
