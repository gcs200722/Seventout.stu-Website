import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import {
  TenantEntity,
  TenantStatus,
} from '../../../platform/tenants/entities/tenant.entity';
import { TenantsService } from '../../../platform/tenants/tenants.service';
import { TenantContextService } from './tenant-context.service';
import { TenantResolverMiddleware } from './tenant-resolver.middleware';
import { TrustedTenantHeaderPolicy } from './trusted-tenant-header.policy';

const TENANT_A_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const TENANT_B_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

function mockRequest(
  headers: Record<string, string>,
  opts?: { ip?: string },
): Request {
  const ip = opts?.ip ?? '';
  return {
    get(name: string): string | undefined {
      const lower = name.toLowerCase();
      const hit = Object.entries(headers).find(
        ([k]) => k.toLowerCase() === lower,
      );
      return hit?.[1];
    },
    ip: ip || undefined,
    socket: { remoteAddress: ip || undefined },
  } as unknown as Request;
}

describe('TenantResolverMiddleware', () => {
  let middleware: TenantResolverMiddleware;
  let tenantContext: jest.Mocked<
    Pick<TenantContextService, 'setTenantContext'>
  >;
  let tenantsService: jest.Mocked<
    Pick<TenantsService, 'normalizeSlug' | 'findBySlug' | 'findById'>
  >;
  let configService: jest.Mocked<Pick<ConfigService, 'get'>>;
  let trustedHeaders: TrustedTenantHeaderPolicy;

  beforeEach(() => {
    tenantContext = {
      setTenantContext: jest.fn(),
    };
    tenantsService = {
      normalizeSlug: jest.fn((s: string) => {
        const t = s.trim().toLowerCase();
        return t;
      }),
      findBySlug: jest.fn(),
      findById: jest.fn(),
    };
    configService = {
      get: jest.fn((key: string, defaultValue?: unknown) => {
        if (key === 'PLATFORM_ROOT_DOMAIN') {
          return 'localtest.me';
        }
        if (key === 'NODE_ENV') {
          return 'test';
        }
        return defaultValue as string | undefined;
      }),
    };
    trustedHeaders = new TrustedTenantHeaderPolicy(
      configService as unknown as ConfigService,
    );
    middleware = new TenantResolverMiddleware(
      tenantContext as unknown as TenantContextService,
      tenantsService as unknown as TenantsService,
      configService as unknown as ConfigService,
      trustedHeaders,
    );
  });

  const run = async (req: Request): Promise<void> => {
    const next = jest.fn();
    await middleware.use(req, {} as Response, next);
    expect(next).toHaveBeenCalledTimes(1);
  };

  it('resolves tenant from Host subdomain matching PLATFORM_ROOT_DOMAIN', async () => {
    tenantsService.findBySlug.mockResolvedValue({
      id: TENANT_A_ID,
      slug: 'shop-a',
      status: TenantStatus.ACTIVE,
    } as TenantEntity);

    await run(mockRequest({ host: 'shop-a.localtest.me:3000' }));

    expect(tenantsService.findBySlug).toHaveBeenCalledWith('shop-a');
    expect(tenantContext.setTenantContext).toHaveBeenCalledWith({
      tenantId: TENANT_A_ID,
      tenantSlug: 'shop-a',
      source: 'host',
      tenantSuspended: false,
    });
  });

  it('prefers X-Forwarded-Host over Host', async () => {
    tenantsService.findBySlug.mockResolvedValue({
      id: TENANT_B_ID,
      slug: 'shop-b',
      status: TenantStatus.ACTIVE,
    } as TenantEntity);

    await run(
      mockRequest({
        'x-forwarded-host': 'shop-b.localtest.me',
        host: 'ignored:3000',
      }),
    );

    expect(tenantsService.findBySlug).toHaveBeenCalledWith('shop-b');
    expect(tenantContext.setTenantContext).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: TENANT_B_ID,
        source: 'host',
      }),
    );
  });

  it('does not resolve slug when host does not match root domain', async () => {
    await run(mockRequest({ host: 'shop-a.other.com' }));

    expect(tenantsService.findBySlug).not.toHaveBeenCalled();
    expect(tenantContext.setTenantContext).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: null,
        tenantSuspended: false,
      }),
    );
  });

  it('sets suspended flag when tenant exists but is not active', async () => {
    tenantsService.findBySlug.mockResolvedValue({
      id: TENANT_A_ID,
      slug: 'bad',
      status: TenantStatus.SUSPENDED,
    } as TenantEntity);

    await run(mockRequest({ host: 'bad.localtest.me' }));

    expect(tenantContext.setTenantContext).toHaveBeenCalledWith({
      tenantId: null,
      tenantSlug: 'bad',
      source: 'none',
      tenantSuspended: true,
    });
  });

  it('resolves from X-Tenant-Slug in non-production', async () => {
    tenantsService.findBySlug.mockResolvedValue({
      id: TENANT_A_ID,
      slug: 'dev-shop',
      status: TenantStatus.ACTIVE,
    } as TenantEntity);

    await run(
      mockRequest({
        host: 'localhost:3000',
        'x-tenant-slug': 'dev-shop',
      }),
    );

    expect(tenantContext.setTenantContext).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: TENANT_A_ID,
        source: 'header',
      }),
    );
  });

  it('rejects dev headers in production without matching dev secret', async () => {
    configService.get.mockImplementation((key: string, defaultValue?: unknown) => {
      if (key === 'PLATFORM_ROOT_DOMAIN') {
        return 'localtest.me';
      }
      if (key === 'NODE_ENV') {
        return 'production';
      }
      if (key === 'TENANT_DEV_HEADER_SECRET') {
        return 'secret';
      }
      return defaultValue as string | undefined;
    });

    trustedHeaders = new TrustedTenantHeaderPolicy(
      configService as unknown as ConfigService,
    );
    middleware = new TenantResolverMiddleware(
      tenantContext as unknown as TenantContextService,
      tenantsService as unknown as TenantsService,
      configService as unknown as ConfigService,
      trustedHeaders,
    );

    await run(
      mockRequest({
        host: 'localhost:3000',
        'x-tenant-slug': 'dev-shop',
      }),
    );

    expect(tenantsService.findBySlug).not.toHaveBeenCalled();
  });

  it('allows dev headers in production when X-Tenant-Dev-Secret matches', async () => {
    configService.get.mockImplementation((key: string, defaultValue?: unknown) => {
      if (key === 'PLATFORM_ROOT_DOMAIN') {
        return 'localtest.me';
      }
      if (key === 'NODE_ENV') {
        return 'production';
      }
      if (key === 'TENANT_DEV_HEADER_SECRET') {
        return 'secret';
      }
      return defaultValue as string | undefined;
    });

    tenantsService.findBySlug.mockResolvedValue({
      id: TENANT_A_ID,
      slug: 'dev-shop',
      status: TenantStatus.ACTIVE,
    } as TenantEntity);

    trustedHeaders = new TrustedTenantHeaderPolicy(
      configService as unknown as ConfigService,
    );
    middleware = new TenantResolverMiddleware(
      tenantContext as unknown as TenantContextService,
      tenantsService as unknown as TenantsService,
      configService as unknown as ConfigService,
      trustedHeaders,
    );

    await run(
      mockRequest({
        host: 'localhost:3000',
        'x-tenant-slug': 'dev-shop',
        'x-tenant-dev-secret': 'secret',
      }),
    );

    expect(tenantsService.findBySlug).toHaveBeenCalled();
    expect(tenantContext.setTenantContext).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: TENANT_A_ID,
        source: 'header',
      }),
    );
  });

  it('rejects trusted headers in production when IP allowlist excludes client', async () => {
    configService.get.mockImplementation((key: string, defaultValue?: unknown) => {
      if (key === 'PLATFORM_ROOT_DOMAIN') {
        return 'localtest.me';
      }
      if (key === 'NODE_ENV') {
        return 'production';
      }
      if (key === 'TENANT_DEV_HEADER_SECRET') {
        return 'secret';
      }
      if (key === 'TENANT_TRUSTED_HEADER_IPS') {
        return '127.0.0.1';
      }
      return defaultValue as string | undefined;
    });

    trustedHeaders = new TrustedTenantHeaderPolicy(
      configService as unknown as ConfigService,
    );
    middleware = new TenantResolverMiddleware(
      tenantContext as unknown as TenantContextService,
      tenantsService as unknown as TenantsService,
      configService as unknown as ConfigService,
      trustedHeaders,
    );

    await run(
      mockRequest(
        {
          host: 'localhost:3000',
          'x-tenant-slug': 'dev-shop',
          'x-tenant-dev-secret': 'secret',
        },
        { ip: '10.0.0.2' },
      ),
    );

    expect(tenantsService.findBySlug).not.toHaveBeenCalled();
  });
});
