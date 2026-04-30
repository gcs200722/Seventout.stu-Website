import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, IsNull, Repository } from 'typeorm';
import type { AuthenticatedUser } from '../../core/auth/auth.types';
import {
  AuditAction,
  AuditEntityType,
  type AuditActionCode,
} from '../../core/audit/audit.constants';
import { AuditWriterService } from '../../core/audit/audit-writer.service';
import { TenantContextService } from '../../core/context/tenant-context.service';
import { forTenantQb } from '../../core/context/for-tenant.util';
import { CategoryEntity } from './category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { ListCategoriesQueryDto } from './dto/list-categories.query.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

export interface CategoryListItemResponse {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  level: 1 | 2;
  image_url: string;
  is_active: boolean;
}

export interface CategoryTreeItemResponse {
  id: string;
  name: string;
  slug: string;
  image_url: string;
  children: Array<{
    id: string;
    name: string;
    slug: string;
    image_url: string;
  }>;
}

export interface CategoryDetailResponse extends CategoryListItemResponse {
  description: string;
}

@Injectable()
export class CategoriesService {
  private treeCache: {
    tenantId: string;
    expiresAt: number;
    data: CategoryTreeItemResponse[];
  } | null = null;
  private readonly treeCacheTtlMs = 60_000;

  constructor(
    @InjectRepository(CategoryEntity)
    private readonly categoriesRepository: Repository<CategoryEntity>,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    private readonly auditWriter: AuditWriterService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async listCategories(
    query: ListCategoriesQueryDto,
  ): Promise<CategoryListItemResponse[]> {
    const tenantId = this.tenantContext.requireTenantId();
    const where: FindOptionsWhere<CategoryEntity> = {
      tenantId,
      deletedAt: IsNull(),
    };

    if (query.parent_id !== undefined) {
      where.parentId = query.parent_id === null ? IsNull() : query.parent_id;
    }

    const categories = await this.categoriesRepository.find({
      where,
      order: { level: 'ASC', sortOrder: 'ASC', name: 'ASC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });

    return categories.map((category) => this.toListResponse(category));
  }

  async listCategoryTree(): Promise<CategoryTreeItemResponse[]> {
    const tenantId = this.tenantContext.requireTenantId();
    const now = Date.now();
    if (
      this.treeCache &&
      this.treeCache.tenantId === tenantId &&
      this.treeCache.expiresAt > now
    ) {
      return this.treeCache.data;
    }

    const roots = await forTenantQb(
      this.categoriesRepository
        .createQueryBuilder('category')
        .leftJoinAndSelect(
          'category.children',
          'child',
          'child.deleted_at IS NULL AND child.level = 2',
        )
        .where('category.deleted_at IS NULL')
        .andWhere('category.level = :rootLevel', { rootLevel: 1 }),
      'category',
      tenantId,
    )
      .orderBy('category.sort_order', 'ASC')
      .addOrderBy('category.name', 'ASC')
      .addOrderBy('child.sort_order', 'ASC')
      .addOrderBy('child.name', 'ASC')
      .getMany();

    const tree = roots.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      image_url: category.imageUrl,
      children: (category.children ?? []).map((child) => ({
        id: child.id,
        name: child.name,
        slug: child.slug,
        image_url: child.imageUrl,
      })),
    }));

    this.treeCache = {
      tenantId,
      data: tree,
      expiresAt: now + this.treeCacheTtlMs,
    };

    return tree;
  }

  async getCategoryById(id: string): Promise<CategoryDetailResponse> {
    const tenantId = this.tenantContext.requireTenantId();
    const category = await this.categoriesRepository.findOne({
      where: { id, tenantId },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return this.toDetailResponse(category);
  }

  async createCategory(
    payload: CreateCategoryDto,
    actor: AuthenticatedUser,
  ): Promise<void> {
    const tenantId = await this.tenantContext.requireTenantIdOrDefault();
    const parent = await this.resolveParent(tenantId, payload.parent_id);
    const level: 1 | 2 = parent ? 2 : 1;
    const slug = await this.ensureUniqueSlug(
      tenantId,
      this.slugify(payload.name),
    );
    await this.ensureUniqueName(tenantId, payload.name, parent?.id ?? null);

    const category = this.categoriesRepository.create({
      name: payload.name,
      tenantId,
      slug,
      description: payload.description ?? '',
      parentId: parent?.id ?? null,
      level,
      imageUrl: payload.image_url ?? '',
      isActive: true,
    });

    const saved = await this.categoriesRepository.save(category);
    this.invalidateTreeCache();

    await this.auditWriter.log({
      action: AuditAction.CREATE,
      entityType: AuditEntityType.CATEGORY,
      entityId: saved.id,
      actor,
      entityLabel: saved.name,
      metadata: { source: 'http' },
      before: null,
      after: this.categoryAuditSnapshot(saved),
    });
  }

  async updateCategory(
    id: string,
    payload: UpdateCategoryDto,
    actor: AuthenticatedUser,
  ): Promise<void> {
    const tenantId = await this.tenantContext.requireTenantIdOrDefault();
    const category = await this.categoriesRepository.findOne({
      where: { id, tenantId },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const beforeSnapshot = this.categoryAuditSnapshot(category);

    if (payload.name !== undefined && payload.name !== category.name) {
      await this.ensureUniqueName(
        tenantId,
        payload.name,
        category.parentId,
        category.id,
      );
      category.name = payload.name;
      category.slug = await this.ensureUniqueSlug(
        tenantId,
        this.slugify(payload.name),
        category.id,
      );
    }
    if (payload.description !== undefined) {
      category.description = payload.description;
    }
    if (payload.image_url !== undefined) {
      category.imageUrl = payload.image_url;
    }
    if (payload.is_active !== undefined) {
      category.isActive = payload.is_active;
    }

    await this.categoriesRepository.save(category);
    this.invalidateTreeCache();

    const afterSnapshot = this.categoryAuditSnapshot(category);
    if (JSON.stringify(beforeSnapshot) !== JSON.stringify(afterSnapshot)) {
      let action: AuditActionCode = AuditAction.UPDATE;
      if (beforeSnapshot.is_active !== afterSnapshot.is_active) {
        action = AuditAction.STATUS_CHANGE;
      }
      await this.auditWriter.log({
        action,
        entityType: AuditEntityType.CATEGORY,
        entityId: id,
        actor,
        entityLabel: category.name,
        metadata: { source: 'http' },
        before: beforeSnapshot,
        after: afterSnapshot,
      });
    }
  }

  async softDeleteCategory(
    id: string,
    actor: AuthenticatedUser,
  ): Promise<void> {
    const tenantId = await this.tenantContext.requireTenantIdOrDefault();
    const category = await this.categoriesRepository.findOne({
      where: { id, tenantId },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const childrenCount = await this.categoriesRepository.count({
      where: { parentId: category.id, tenantId, deletedAt: IsNull() },
    });
    if (childrenCount > 0) {
      throw new BadRequestException({
        message: 'Category has active children',
        details: { code: 'CATEGORY_HAS_CHILDREN' },
      });
    }

    const isUsedByProduct = await this.isCategoryUsedByProduct(
      category.id,
      tenantId,
    );
    if (isUsedByProduct) {
      throw new BadRequestException({
        message: 'Category is assigned to products',
        details: { code: 'CATEGORY_IN_USE' },
      });
    }

    await this.categoriesRepository.softDelete(category.id);
    this.invalidateTreeCache();

    await this.auditWriter.log({
      action: AuditAction.DELETE,
      entityType: AuditEntityType.CATEGORY,
      entityId: id,
      actor,
      entityLabel: category.name,
      metadata: { source: 'http' },
      before: this.categoryAuditSnapshot(category),
      after: null,
    });
  }

  private categoryAuditSnapshot(category: CategoryEntity): {
    name: string;
    slug: string;
    is_active: boolean;
    level: number;
    parent_id: string | null;
  } {
    return {
      name: category.name,
      slug: category.slug,
      is_active: category.isActive,
      level: category.level,
      parent_id: category.parentId,
    };
  }

  private async resolveParent(
    tenantId: string,
    parentId?: string | null,
  ): Promise<CategoryEntity | null> {
    if (!parentId) {
      return null;
    }

    const parent = await this.categoriesRepository.findOne({
      where: { id: parentId, tenantId },
    });
    if (!parent || parent.level !== 1) {
      throw new BadRequestException({
        message: 'Parent category is not valid',
        details: { code: 'INVALID_PARENT' },
      });
    }
    return parent;
  }

  private async ensureUniqueName(
    tenantId: string,
    name: string,
    parentId: string | null,
    excludeId?: string,
  ): Promise<void> {
    const queryBuilder = this.categoriesRepository
      .createQueryBuilder('category')
      .where('category.deleted_at IS NULL')
      .andWhere('category.tenant_id = :tenantId', { tenantId })
      .andWhere('LOWER(category.name) = LOWER(:name)', { name });

    if (parentId === null) {
      queryBuilder.andWhere('category.parent_id IS NULL');
    } else {
      queryBuilder.andWhere('category.parent_id = :parentId', { parentId });
    }

    if (excludeId) {
      queryBuilder.andWhere('category.id != :excludeId', { excludeId });
    }

    const duplicated = await queryBuilder.getOne();
    if (duplicated) {
      throw new BadRequestException({
        message: 'Category name already exists in this level',
        details: { code: 'DUPLICATE_CATEGORY_NAME' },
      });
    }
  }

  private async ensureUniqueSlug(
    tenantId: string,
    baseSlug: string,
    excludeId?: string,
  ): Promise<string> {
    let candidate = baseSlug;
    let suffix = 1;

    while (true) {
      const queryBuilder = this.categoriesRepository
        .createQueryBuilder('category')
        .where('category.deleted_at IS NULL')
        .andWhere('category.tenant_id = :tenantId', { tenantId })
        .andWhere('category.slug = :slug', { slug: candidate });

      if (excludeId) {
        queryBuilder.andWhere('category.id != :excludeId', { excludeId });
      }

      const existing = await queryBuilder.getOne();
      if (!existing) {
        return candidate;
      }

      suffix += 1;
      candidate = `${baseSlug}-${suffix}`;
    }
  }

  private slugify(value: string): string {
    const sanitized = value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
    return sanitized || 'category';
  }

  private async isCategoryUsedByProduct(
    categoryId: string,
    tenantId: string,
  ): Promise<boolean> {
    const columns: Array<{ column_name: string }> = await this.dataSource.query(
      `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'products'
      `,
    );

    const columnSet = new Set(columns.map((column) => column.column_name));
    if (!columnSet.has('category_id')) {
      return false;
    }

    let countQuery =
      'SELECT COUNT(*)::int AS count FROM products WHERE category_id = $1';
    const params: Array<string> = [categoryId];
    if (columnSet.has('tenant_id')) {
      countQuery += ' AND tenant_id = $2';
      params.push(tenantId);
    }
    if (columnSet.has('deleted_at')) {
      countQuery += ' AND deleted_at IS NULL';
    }

    const result: Array<{ count: number }> = await this.dataSource.query(
      countQuery,
      params,
    );
    return Number(result[0]?.count ?? 0) > 0;
  }

  private toListResponse(category: CategoryEntity): CategoryListItemResponse {
    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      parent_id: category.parentId,
      level: category.level,
      image_url: category.imageUrl,
      is_active: category.isActive,
    };
  }

  private toDetailResponse(category: CategoryEntity): CategoryDetailResponse {
    return {
      ...this.toListResponse(category),
      description: category.description,
    };
  }

  private invalidateTreeCache(): void {
    this.treeCache = null;
  }
}
