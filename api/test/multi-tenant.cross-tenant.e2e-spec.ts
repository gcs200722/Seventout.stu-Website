/**
 * Cross-tenant isolation: storefront Host resolves tenant A vs B;
 * mocked listing returns B-only product — tenant A must not see it.
 *
 * Run: pnpm test:e2e -- multi-tenant.cross-tenant
 */
import {
  MiddlewareConsumer,
  Module,
  NestModule,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { ClsMiddleware, ClsModule } from 'nestjs-cls';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import {
  TenantEntity,
  TenantStatus,
} from '../src/modules/platform/tenants/entities/tenant.entity';
import { TenantsService } from '../src/modules/platform/tenants/tenants.service';
import { TenantResolverMiddleware } from '../src/modules/tenant/core/context/tenant-resolver.middleware';
import { TenantContextService } from '../src/modules/tenant/core/context/tenant-context.service';
import { TrustedTenantHeaderPolicy } from '../src/modules/tenant/core/context/trusted-tenant-header.policy';
import { TenantGuard } from '../src/modules/tenant/core/context/tenant.guard';
import { ProductsController } from '../src/modules/tenant/extensions/products/products.controller';
import { ProductsService } from '../src/modules/tenant/extensions/products/products.service';

const TENANT_A_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const TENANT_B_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

@Module({
  imports: [
    ClsModule.forRoot({
      global: true,
      middleware: { mount: false },
    }),
  ],
  controllers: [ProductsController],
  providers: [
    TenantGuard,
    TenantContextService,
    TrustedTenantHeaderPolicy,
    TenantResolverMiddleware,
    {
      provide: ProductsService,
      useValue: {
        listProducts: jest.fn(),
      },
    },
    {
      provide: TenantsService,
      useValue: {
        normalizeSlug: (s: string) => s.trim().toLowerCase(),
        findBySlug: jest.fn(),
        findById: jest.fn(),
      },
    },
    {
      provide: ConfigService,
      useValue: {
        get: (key: string, defaultValue?: unknown) => {
          if (key === 'PLATFORM_ROOT_DOMAIN') {
            return 'localtest.me';
          }
          if (key === 'NODE_ENV') {
            return 'test';
          }
          return defaultValue as string | undefined;
        },
      },
    },
    {
      provide: DataSource,
      useValue: {
        query: jest.fn().mockResolvedValue([]),
      },
    },
  ],
})
class CrossTenantHarnessModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(ClsMiddleware, TenantResolverMiddleware)
      .forRoutes(ProductsController);
  }
}

describe('Multi-tenant cross-tenant (e2e harness)', () => {
  let app: import('@nestjs/common').INestApplication<App>;
  let productsService: { listProducts: jest.Mock };
  let tenantsService: { findBySlug: jest.Mock };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [CrossTenantHarnessModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();

    productsService = moduleRef.get(ProductsService) as {
      listProducts: jest.Mock;
    };
    tenantsService = moduleRef.get(TenantsService) as {
      findBySlug: jest.Mock;
    };

    tenantsService.findBySlug.mockImplementation(async (slug: string) => {
      if (slug === 'shop-a') {
        return {
          id: TENANT_A_ID,
          slug: 'shop-a',
          status: TenantStatus.ACTIVE,
        } as TenantEntity;
      }
      if (slug === 'shop-b') {
        return {
          id: TENANT_B_ID,
          slug: 'shop-b',
          status: TenantStatus.ACTIVE,
        } as TenantEntity;
      }
      return null;
    });

    const tenantContext = app.get(TenantContextService);
    productsService.listProducts.mockImplementation(async () => {
      const tid = tenantContext.getTenantId();
      if (tid === TENANT_B_ID) {
        return {
          items: [{ id: 'product-only-on-b', name: 'B item' }],
          total: 1,
        };
      }
      return { items: [], total: 0 };
    });
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });

  it('tenant A Host does not see tenant B-only catalog rows', async () => {
    const resA = await request(app.getHttpServer())
      .get('/products')
      .set('Host', 'shop-a.localtest.me');

    expect(resA.status).toBe(200);
    expect(resA.body.data).toEqual([]);

    const resB = await request(app.getHttpServer())
      .get('/products')
      .set('Host', 'shop-b.localtest.me');

    expect(resB.status).toBe(200);
    expect(resB.body.data).toHaveLength(1);
    expect(resB.body.data[0].id).toBe('product-only-on-b');
  });

  it('returns 404 when tenant cannot be resolved for protected storefront route', async () => {
    tenantsService.findBySlug.mockResolvedValue(null);

    const res = await request(app.getHttpServer())
      .get('/products')
      .set('Host', 'unknown.localtest.me');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error?.message).toBe('Resource not found.');
    expect(res.body.error?.code).toBe('TENANT_NOT_RESOLVED');
  });
});
