import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import type { AuthenticatedUser } from '../../core/auth/auth.types';
import { UserRole } from '../../core/authorization/authorization.types';
import { AuditWriterService } from '../../core/audit/audit-writer.service';
import type { TenantContextService } from '../../core/context/tenant-context.service';

const TENANT_ID = 'tenant-test-1';
import { CategoryEntity } from './category.entity';
import { CategoriesService } from './categories.service';

const testActor: AuthenticatedUser = {
  id: 'user-1',
  email: 'staff@test.com',
  role: UserRole.STAFF,
  permissions: [],
};

type QueryBuilderMock = {
  where: jest.Mock;
  andWhere: jest.Mock;
  orderBy: jest.Mock;
  addOrderBy: jest.Mock;
  leftJoinAndSelect: jest.Mock;
  getOne: jest.Mock;
  getMany: jest.Mock;
};

function repoMocks(repo: jest.Mocked<Repository<CategoryEntity>>) {
  return repo as unknown as {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    count: jest.Mock;
    softDelete: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
}

const buildQueryBuilderMock = (): QueryBuilderMock => {
  const builder = {
    where: jest.fn(),
    andWhere: jest.fn(),
    orderBy: jest.fn(),
    addOrderBy: jest.fn(),
    leftJoinAndSelect: jest.fn(),
    getOne: jest.fn(),
    getMany: jest.fn(),
  };
  builder.where.mockReturnValue(builder);
  builder.andWhere.mockReturnValue(builder);
  builder.orderBy.mockReturnValue(builder);
  builder.addOrderBy.mockReturnValue(builder);
  builder.leftJoinAndSelect.mockReturnValue(builder);
  return builder;
};

describe('CategoriesService', () => {
  let service: CategoriesService;
  let categoriesRepository: jest.Mocked<Repository<CategoryEntity>>;
  let dataSource: jest.Mocked<DataSource>;
  let auditWriter: { log: jest.Mock };
  let configService: { get: jest.Mock };
  let tenantContext: jest.Mocked<
    Pick<TenantContextService, 'requireTenantId' | 'requireTenantIdOrDefault'>
  >;

  beforeEach(() => {
    categoriesRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      count: jest.fn(),
      softDelete: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as unknown as jest.Mocked<Repository<CategoryEntity>>;
    dataSource = {
      query: jest.fn(),
    } as unknown as jest.Mocked<DataSource>;
    auditWriter = { log: jest.fn().mockResolvedValue(undefined) };
    configService = { get: jest.fn() };
    tenantContext = {
      requireTenantId: jest.fn().mockReturnValue(TENANT_ID),
      requireTenantIdOrDefault: jest.fn().mockResolvedValue(TENANT_ID),
    };
    service = new CategoriesService(
      categoriesRepository,
      configService as never,
      dataSource,
      auditWriter as unknown as AuditWriterService,
      tenantContext as never,
    );
  });

  it('should_throw_invalid_parent_when_create_category_with_non_root_parent', async () => {
    categoriesRepository.findOne.mockResolvedValue({
      id: 'parent-2',
      level: 2,
    } as CategoryEntity);

    await expect(
      service.createCategory(
        { name: 'Hoodie', parent_id: 'parent-2' },
        testActor,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should_throw_not_found_when_get_category_detail_missing', async () => {
    categoriesRepository.findOne.mockResolvedValue(null);

    await expect(service.getCategoryById('missing')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should_throw_has_children_when_soft_delete_parent_with_children', async () => {
    categoriesRepository.findOne.mockResolvedValue({
      id: 'cat-1',
    } as CategoryEntity);
    categoriesRepository.count.mockResolvedValue(2);

    await expect(
      service.softDeleteCategory('cat-1', testActor),
    ).rejects.toThrow(BadRequestException);
  });

  it('should_throw_category_in_use_when_soft_delete_category_assigned_to_products', async () => {
    categoriesRepository.findOne.mockResolvedValue({
      id: 'cat-2',
    } as CategoryEntity);
    categoriesRepository.count.mockResolvedValue(0);
    dataSource.query
      .mockResolvedValueOnce([{ column_name: 'category_id' }])
      .mockResolvedValueOnce([{ count: 1 }]);

    await expect(
      service.softDeleteCategory('cat-2', testActor),
    ).rejects.toThrow(BadRequestException);
  });

  it('should_use_cache_when_list_category_tree_called_within_ttl', async () => {
    const queryBuilder = buildQueryBuilderMock();
    queryBuilder.getMany.mockResolvedValue([
      {
        id: 'root-1',
        name: 'Ao',
        slug: 'ao',
        imageUrl: 'https://cdn.example.com/category/ao.jpg',
        children: [
          {
            id: 'child-1',
            name: 'Hoodie',
            slug: 'hoodie',
            imageUrl: 'https://cdn.example.com/category/hoodie.jpg',
          },
        ],
      },
    ]);
    const repoWithMockQueryBuilder = categoriesRepository as unknown as {
      createQueryBuilder: jest.Mock;
    };
    const createQueryBuilderSpy = repoWithMockQueryBuilder.createQueryBuilder;
    createQueryBuilderSpy.mockReturnValue(queryBuilder as never);

    const first = await service.listCategoryTree();
    const second = await service.listCategoryTree();

    expect(first).toEqual(second);
    expect(createQueryBuilderSpy).toHaveBeenCalledTimes(1);
  });

  it('should_return_list_when_list_categories_called', async () => {
    categoriesRepository.find.mockResolvedValue([
      {
        id: 'c1',
        name: 'Ao',
        slug: 'ao',
        description: '',
        parentId: null,
        level: 1,
        imageUrl: '',
        isActive: true,
        sortOrder: 0,
      },
    ] as CategoryEntity[]);

    const result = await service.listCategories({
      page: 1,
      limit: 10,
      parent_id: null,
    });

    expect(result).toEqual([
      {
        id: 'c1',
        name: 'Ao',
        slug: 'ao',
        parent_id: null,
        level: 1,
        image_url: '',
        is_active: true,
      },
    ]);
    const { find: findMock } = repoMocks(categoriesRepository);
    expect(findMock).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 10,
      }),
    );
  });

  it('should_return_detail_when_get_category_by_id_found', async () => {
    categoriesRepository.findOne.mockResolvedValue({
      id: 'c1',
      name: 'Ao',
      slug: 'ao',
      description: 'Mô tả',
      parentId: null,
      level: 1,
      imageUrl: 'https://x.jpg',
      isActive: true,
    } as CategoryEntity);

    const result = await service.getCategoryById('c1');

    expect(result).toEqual({
      id: 'c1',
      name: 'Ao',
      slug: 'ao',
      parent_id: null,
      level: 1,
      image_url: 'https://x.jpg',
      is_active: true,
      description: 'Mô tả',
    });
  });

  it('should_throw_when_parent_id_missing_for_create', async () => {
    categoriesRepository.findOne.mockResolvedValue(null);

    await expect(
      service.createCategory(
        { name: 'Child', parent_id: 'missing-parent' },
        testActor,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should_create_root_category_when_valid', async () => {
    const repoWithMockQueryBuilder = categoriesRepository as unknown as {
      createQueryBuilder: jest.Mock;
    };
    const createQueryBuilderSpy = repoWithMockQueryBuilder.createQueryBuilder;
    createQueryBuilderSpy.mockImplementation(() => {
      const qb = buildQueryBuilderMock();
      qb.getOne.mockResolvedValue(null);
      return qb;
    });

    const { create: createMock, save: saveMock } =
      repoMocks(categoriesRepository);
    createMock.mockImplementation((partial) => partial as CategoryEntity);
    saveMock.mockResolvedValue({
      id: 'new-cat',
      name: 'Tee Basic',
      slug: 'tee-basic',
      isActive: true,
      level: 1,
      parentId: null,
    } as CategoryEntity);

    await service.createCategory({ name: 'Tee Basic' }, testActor);

    expect(saveMock).toHaveBeenCalled();
    const saved = (saveMock.mock.calls[0] as [CategoryEntity])[0];
    expect(saved.level).toBe(1);
    expect(saved.parentId).toBeNull();
    expect(saved.slug).toBeDefined();
  });

  it('should_create_child_category_when_parent_is_level_1', async () => {
    const repoWithMockQueryBuilder = categoriesRepository as unknown as {
      createQueryBuilder: jest.Mock;
    };
    repoWithMockQueryBuilder.createQueryBuilder.mockImplementation(() => {
      const qb = buildQueryBuilderMock();
      qb.getOne.mockResolvedValue(null);
      return qb;
    });

    categoriesRepository.findOne.mockResolvedValue({
      id: 'parent-1',
      level: 1,
    } as CategoryEntity);
    const { create: createMock, save: saveMock } =
      repoMocks(categoriesRepository);
    createMock.mockImplementation((partial) => partial as CategoryEntity);
    saveMock.mockResolvedValue({
      id: 'child-cat',
      name: 'Hoodie',
      slug: 'hoodie',
      isActive: true,
      level: 2,
      parentId: 'parent-1',
    } as CategoryEntity);

    await service.createCategory(
      {
        name: 'Hoodie',
        parent_id: 'parent-1',
      },
      testActor,
    );

    const saved = (saveMock.mock.calls[0] as [CategoryEntity])[0];
    expect(saved.level).toBe(2);
    expect(saved.parentId).toBe('parent-1');
  });

  it('should_throw_duplicate_name_when_create_conflicts', async () => {
    const repoWithMockQueryBuilder = categoriesRepository as unknown as {
      createQueryBuilder: jest.Mock;
    };
    let call = 0;
    repoWithMockQueryBuilder.createQueryBuilder.mockImplementation(() => {
      const qb = buildQueryBuilderMock();
      call += 1;
      if (call === 2) {
        qb.getOne.mockResolvedValue({ id: 'dup' } as CategoryEntity);
      } else {
        qb.getOne.mockResolvedValue(null);
      }
      return qb;
    });

    await expect(
      service.createCategory({ name: 'Unique Name' }, testActor),
    ).rejects.toThrow(BadRequestException);
  });

  it('should_throw_not_found_when_update_category_missing', async () => {
    categoriesRepository.findOne.mockResolvedValue(null);

    await expect(
      service.updateCategory('missing', { name: 'X' }, testActor),
    ).rejects.toThrow(NotFoundException);
  });

  it('should_update_category_when_found', async () => {
    const repoWithMockQueryBuilder = categoriesRepository as unknown as {
      createQueryBuilder: jest.Mock;
    };
    repoWithMockQueryBuilder.createQueryBuilder.mockImplementation(() => {
      const qb = buildQueryBuilderMock();
      qb.getOne.mockResolvedValue(null);
      return qb;
    });

    categoriesRepository.findOne.mockResolvedValue({
      id: 'c1',
      name: 'Old',
      slug: 'old',
      description: '',
      parentId: null,
      level: 1,
      imageUrl: '',
      isActive: true,
    } as CategoryEntity);
    const { save: saveMock } = repoMocks(categoriesRepository);
    saveMock.mockResolvedValue({} as CategoryEntity);

    await service.updateCategory(
      'c1',
      {
        name: 'New Label',
        description: 'd',
        is_active: false,
      },
      testActor,
    );

    expect(saveMock).toHaveBeenCalled();
  });

  it('should_throw_not_found_when_soft_delete_missing', async () => {
    categoriesRepository.findOne.mockResolvedValue(null);

    await expect(
      service.softDeleteCategory('missing', testActor),
    ).rejects.toThrow(NotFoundException);
  });

  it('should_soft_delete_when_no_children_and_not_in_use', async () => {
    categoriesRepository.findOne.mockResolvedValue({
      id: 'leaf-1',
    } as CategoryEntity);
    categoriesRepository.count.mockResolvedValue(0);
    dataSource.query.mockResolvedValueOnce([]);

    await service.softDeleteCategory('leaf-1', testActor);

    const { softDelete: softDeleteMock } = repoMocks(categoriesRepository);
    expect(softDeleteMock).toHaveBeenCalledWith('leaf-1');
  });

  it('should_resolve_slug_suffix_when_base_slug_taken', async () => {
    const repoWithMockQueryBuilder = categoriesRepository as unknown as {
      createQueryBuilder: jest.Mock;
    };
    let call = 0;
    repoWithMockQueryBuilder.createQueryBuilder.mockImplementation(() => {
      const qb = buildQueryBuilderMock();
      call += 1;
      if (call === 1) {
        qb.getOne.mockResolvedValue({ id: 'other' } as CategoryEntity);
      } else {
        qb.getOne.mockResolvedValue(null);
      }
      return qb;
    });

    const { create: createMock, save: saveMock } =
      repoMocks(categoriesRepository);
    createMock.mockImplementation((partial) => partial as CategoryEntity);
    saveMock.mockResolvedValue({
      id: 'dup-cat',
      name: 'Dup',
      slug: 'dup-x',
      isActive: true,
      level: 1,
      parentId: null,
    } as CategoryEntity);

    await service.createCategory({ name: 'Dup' }, testActor);

    const saved = (saveMock.mock.calls[0] as [CategoryEntity])[0];
    expect(saved.slug).toMatch(/dup-/);
  });
});
