import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { TenantEntity, TenantStatus } from './entities/tenant.entity';
import { TenantsService } from './tenants.service';

describe('TenantsService', () => {
  let service: TenantsService;
  let tenantsRepository: jest.Mocked<Repository<TenantEntity>>;
  let queryBuilder: {
    where: jest.Mock;
    andWhere: jest.Mock;
    getOne: jest.Mock;
  };

  beforeEach(() => {
    queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    };

    tenantsRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    } as unknown as jest.Mocked<Repository<TenantEntity>>;

    service = new TenantsService(tenantsRepository);
  });

  it('should_lookup_by_id', async () => {
    tenantsRepository.findOne.mockResolvedValue({
      id: 'tenant-1',
      slug: 'default',
      name: 'Default Tenant',
      status: TenantStatus.ACTIVE,
    } as TenantEntity);

    const tenant = await service.findById('tenant-1');

    expect(tenant?.id).toBe('tenant-1');
    expect(tenantsRepository.findOne.mock.calls[0]).toEqual([
      { where: { id: 'tenant-1' } },
    ]);
  });

  it('should_list_all_tenants_sorted_by_created_at_desc', async () => {
    tenantsRepository.find.mockResolvedValue([
        { id: 'tenant-2', slug: 'beta' },
        { id: 'tenant-1', slug: 'alpha' },
      ] as TenantEntity[]);

    const result = await service.listAll();

    expect(Array.isArray(result)).toBe(true);
    expect(tenantsRepository.find).toHaveBeenCalledWith({
      order: { createdAt: 'DESC' },
    });
  });

  it('should_lookup_slug_case_insensitive', async () => {
    queryBuilder.getOne.mockResolvedValue({
      id: 'tenant-1',
      slug: 'default',
      name: 'Default Tenant',
      status: TenantStatus.ACTIVE,
    } as TenantEntity);

    const tenant = await service.findBySlug('DeFaUlT');

    expect(tenant?.slug).toBe('default');
    expect(queryBuilder.where).toHaveBeenCalledWith(
      'LOWER(tenant.slug) = :slug',
      { slug: 'default' },
    );
  });

  it('should_only_return_active_tenant_when_find_active_by_slug', async () => {
    queryBuilder.getOne.mockResolvedValue({
      id: 'tenant-1',
      slug: 'default',
      name: 'Default Tenant',
      status: TenantStatus.ACTIVE,
    } as TenantEntity);

    const tenant = await service.findActiveBySlug('default');

    expect(tenant?.status).toBe(TenantStatus.ACTIVE);
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'tenant.status = :status',
      { status: TenantStatus.ACTIVE },
    );
  });

  it('should_reject_reserved_slug', () => {
    expect(() => service.normalizeSlug('admin')).toThrow(BadRequestException);
  });

  it('should_update_status_when_tenant_exists', async () => {
    tenantsRepository.findOne.mockResolvedValue({
      id: 'tenant-1',
      slug: 'default',
      name: 'Default Tenant',
      status: TenantStatus.ACTIVE,
    } as TenantEntity);
    tenantsRepository.save.mockImplementation(async (input: TenantEntity) => input);

    const result = await service.updateStatus('tenant-1', TenantStatus.SUSPENDED);
    expect(result?.status).toBe(TenantStatus.SUSPENDED);
  });
});
