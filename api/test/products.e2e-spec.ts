import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { type AuthenticatedUser } from '../src/modules/tenant/core/auth/auth.types';
import { JwtAuthGuard } from '../src/modules/tenant/core/auth/guards/jwt-auth.guard';
import {
  PermissionCode,
  UserRole,
} from '../src/modules/tenant/core/authorization/authorization.types';
import { AuthorizationGuard } from '../src/modules/tenant/core/authorization/guards/authorization.guard';
import { ProductsController } from '../src/modules/tenant/extensions/products/products.controller';
import { ProductsService } from '../src/modules/tenant/extensions/products/products.service';

type RequestHeaders = Record<string, string | string[] | undefined>;
type RequestWithAuth = {
  headers: RequestHeaders;
  user?: AuthenticatedUser;
};

class MockJwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithAuth>();
    const roleHeader = request.headers['x-role'];
    const permissionsHeader = request.headers['x-permissions'];
    const userIdHeader = request.headers['x-user-id'];

    const roleHeaderValue = Array.isArray(roleHeader)
      ? roleHeader[0]
      : roleHeader;
    const permissionsHeaderValue = Array.isArray(permissionsHeader)
      ? permissionsHeader[0]
      : permissionsHeader;
    const userIdHeaderValue = Array.isArray(userIdHeader)
      ? userIdHeader[0]
      : userIdHeader;

    const role = this.toRole(roleHeaderValue);
    const permissions =
      typeof permissionsHeaderValue === 'string' &&
      permissionsHeaderValue.length > 0
        ? permissionsHeaderValue.split(',').map((item) => item.trim())
        : [];

    request.user = {
      id:
        typeof userIdHeaderValue === 'string'
          ? userIdHeaderValue
          : 'user-default',
      email: 'user@example.com',
      role,
      permissions,
    };

    return true;
  }

  private toRole(value: string | undefined): UserRole {
    if (
      value === UserRole.ADMIN ||
      value === UserRole.STAFF ||
      value === UserRole.USER
    ) {
      return value;
    }

    return UserRole.USER;
  }
}

describe('ProductsController (e2e)', () => {
  let app: INestApplication<App>;
  const productsService = {
    listProducts: jest.fn(),
    getProductById: jest.fn(),
    createProduct: jest.fn(),
    updateProduct: jest.fn(),
    softDeleteProduct: jest.fn(),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        AuthorizationGuard,
        { provide: ProductsService, useValue: productsService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(MockJwtAuthGuard)
      .compile();

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
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });

  it('GET /products should return list without auth (public)', async () => {
    productsService.listProducts.mockResolvedValue({
      items: [
        {
          id: 'p-1',
          name: 'Hoodie',
          slug: 'hoodie',
          price: 350000,
          thumbnail: 'https://cdn.example.com/h.jpg',
          category: { id: 'c-1', name: 'Hoodie' },
          is_active: true,
          created_at: '2024-01-01T00:00:00.000Z',
        },
      ],
      total: 1,
    });

    const response = await request(app.getHttpServer())
      .get('/products?page=1&limit=10&sort=newest')
      .expect(200);

    const body = response.body as {
      success: boolean;
      pagination: { total: number };
    };
    expect(body.success).toBe(true);
    expect(body.pagination.total).toBe(1);
    expect(productsService.listProducts).toHaveBeenCalled();
  });

  it('GET /products/:id should return detail without auth (public)', async () => {
    productsService.getProductById.mockResolvedValue({
      id: 'p-1',
      name: 'Hoodie',
      slug: 'hoodie',
      description: 'Desc',
      price: 350000,
      category: {
        id: 'c-1',
        name: 'Hoodie',
        parent: { id: 'root', name: 'Áo' },
      },
      images: ['https://cdn.example.com/1.jpg'],
      is_active: true,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-02T00:00:00.000Z',
    });

    await request(app.getHttpServer())
      .get('/products/78ff6607-8c95-4eab-981e-3236d2b1d6f4')
      .expect(200)
      .expect({
        success: true,
        data: {
          id: 'p-1',
          name: 'Hoodie',
          slug: 'hoodie',
          description: 'Desc',
          price: 350000,
          category: {
            id: 'c-1',
            name: 'Hoodie',
            parent: { id: 'root', name: 'Áo' },
          },
          images: ['https://cdn.example.com/1.jpg'],
          is_active: true,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-02T00:00:00.000Z',
        },
      });
  });

  it('POST /products should succeed for staff with PRODUCT_MANAGE', async () => {
    productsService.createProduct.mockResolvedValue(undefined);

    await request(app.getHttpServer())
      .post('/products')
      .set('x-role', UserRole.STAFF)
      .set('x-permissions', PermissionCode.PRODUCT_MANAGE)
      .send({
        name: 'Hoodie',
        description: 'Nice',
        price: 350000,
        category_id: '78ff6607-8c95-4eab-981e-3236d2b1d6f4',
        images: ['https://cdn.example.com/1.jpg'],
      })
      .expect(201)
      .expect({
        success: true,
        message: 'Product created successfully',
      });
  });

  it('POST /products should accept multipart upload', async () => {
    productsService.createProduct.mockResolvedValue(undefined);

    await request(app.getHttpServer())
      .post('/products')
      .set('x-role', UserRole.STAFF)
      .set('x-permissions', PermissionCode.PRODUCT_MANAGE)
      .field('name', 'Hoodie')
      .field('description', 'Nice')
      .field('price', '350000')
      .field('category_id', '78ff6607-8c95-4eab-981e-3236d2b1d6f4')
      .attach('image_files', Buffer.from('img-a'), 'a.jpg')
      .expect(201);
  });

  it('PATCH /products/:id should succeed for admin', async () => {
    productsService.updateProduct.mockResolvedValue(undefined);

    await request(app.getHttpServer())
      .patch('/products/78ff6607-8c95-4eab-981e-3236d2b1d6f4')
      .set('x-role', UserRole.ADMIN)
      .send({
        name: 'Hoodie Oversize',
        price: 400000,
        is_active: true,
      })
      .expect(200)
      .expect({
        success: true,
        message: 'Product updated successfully',
      });
  });

  it('PATCH /products/:id should accept multipart images', async () => {
    productsService.updateProduct.mockResolvedValue(undefined);

    await request(app.getHttpServer())
      .patch('/products/78ff6607-8c95-4eab-981e-3236d2b1d6f4')
      .set('x-role', UserRole.ADMIN)
      .field('name', 'Hoodie new')
      .attach('image_files', Buffer.from('img-a'), 'a.jpg')
      .expect(200);
  });

  it('DELETE /products/:id should return 403 for staff without PRODUCT_MANAGE', async () => {
    await request(app.getHttpServer())
      .delete('/products/78ff6607-8c95-4eab-981e-3236d2b1d6f4')
      .set('x-role', UserRole.STAFF)
      .set('x-permissions', PermissionCode.CATEGORY_READ)
      .expect(403);
  });
});
