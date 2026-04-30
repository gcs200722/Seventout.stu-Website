import {
  CanActivate,
  ExecutionContext,
  INestApplication,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PlatformJwtAuthGuard } from '../src/modules/platform/core/auth/guards/platform-jwt-auth.guard';
import { PlatformAuthorizationGuard } from '../src/modules/platform/core/authorization/guards/platform-authorization.guard';
import { TenantsController } from '../src/modules/platform/tenants/tenants.controller';
import { TenantStatus } from '../src/modules/platform/tenants/entities/tenant.entity';
import { TenantsService } from '../src/modules/platform/tenants/tenants.service';

type RequestHeaders = Record<string, string | string[] | undefined>;

class MockPlatformJwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{
      headers: RequestHeaders;
      user?: unknown;
    }>();
    const permissionsHeader = req.headers['x-platform-permissions'];
    const permissionsValue = Array.isArray(permissionsHeader)
      ? permissionsHeader[0]
      : permissionsHeader;
    req.user = {
      id: 'platform-user-1',
      email: 'platform@example.com',
      role: 'ADMIN',
      platformPermissions:
        typeof permissionsValue === 'string' && permissionsValue.length > 0
          ? permissionsValue.split(',').map((item) => item.trim())
          : [],
      tokenScope: 'platform',
    };
    return true;
  }
}

describe('Platform tenants authorization (e2e)', () => {
  let app: INestApplication<App>;
  const tenantsService = {
    listAll: jest.fn(),
    updateStatus: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [TenantsController],
      providers: [
        { provide: TenantsService, useValue: tenantsService },
        PlatformAuthorizationGuard,
      ],
    })
      .overrideGuard(PlatformJwtAuthGuard)
      .useClass(MockPlatformJwtAuthGuard)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('allows list tenants with PLATFORM_TENANT_READ', async () => {
    tenantsService.listAll.mockResolvedValue([
      {
        id: 'tenant-1',
        slug: 'default',
        name: 'Default',
        status: TenantStatus.ACTIVE,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ]);

    await request(app.getHttpServer())
      .get('/platform/tenants')
      .set('x-platform-permissions', 'PLATFORM_TENANT_READ')
      .expect(200);
  });

  it('denies list tenants without PLATFORM_TENANT_READ', async () => {
    await request(app.getHttpServer())
      .get('/platform/tenants')
      .set('x-platform-permissions', 'PLATFORM_TENANT_MANAGE')
      .expect(403);
  });

  it('allows update status with PLATFORM_TENANT_MANAGE', async () => {
    tenantsService.updateStatus.mockResolvedValue({
      id: 'tenant-1',
      slug: 'default',
      name: 'Default',
      status: TenantStatus.SUSPENDED,
    });

    await request(app.getHttpServer())
      .patch('/platform/tenants/tenant-1/status')
      .set('x-platform-permissions', 'PLATFORM_TENANT_MANAGE')
      .send({ status: TenantStatus.SUSPENDED })
      .expect(200);
  });

  it('denies update status without PLATFORM_TENANT_MANAGE', async () => {
    await request(app.getHttpServer())
      .patch('/platform/tenants/tenant-1/status')
      .set('x-platform-permissions', 'PLATFORM_TENANT_READ')
      .send({ status: TenantStatus.SUSPENDED })
      .expect(403);
  });
});
