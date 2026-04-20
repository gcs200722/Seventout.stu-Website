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
import { type AuthenticatedUser } from '../src/modules/auth/auth.types';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import {
  PermissionCode,
  UserRole,
} from '../src/modules/authorization/authorization.types';
import { AuthorizationGuard } from '../src/modules/authorization/guards/authorization.guard';
import { CategoriesController } from '../src/modules/categories/categories.controller';
import { CategoriesService } from '../src/modules/categories/categories.service';

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

describe('CategoriesController (e2e)', () => {
  let app: INestApplication<App>;
  const categoriesService = {
    listCategories: jest.fn(),
    listCategoryTree: jest.fn(),
    getCategoryById: jest.fn(),
    createCategory: jest.fn(),
    updateCategory: jest.fn(),
    softDeleteCategory: jest.fn(),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [
        AuthorizationGuard,
        { provide: CategoriesService, useValue: categoriesService },
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

  it('GET /categories should return flat list without auth (public)', async () => {
    categoriesService.listCategories.mockResolvedValue([
      {
        id: 'cat-1',
        name: 'Ao',
        slug: 'ao',
        parent_id: null,
        level: 1,
        image_url: 'https://cdn.example.com/category/ao.jpg',
        is_active: true,
      },
    ]);

    const response = await request(app.getHttpServer())
      .get('/categories?page=1&limit=10&parent_id=null')
      .expect(200);

    const body = response.body as { success: boolean };
    expect(body.success).toBe(true);
    expect(categoriesService.listCategories).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      parent_id: null,
    });
  });

  it('GET /categories/tree should return category tree without auth (public)', async () => {
    categoriesService.listCategoryTree.mockResolvedValue([
      {
        id: 'cat-1',
        name: 'Ao',
        slug: 'ao',
        image_url: 'https://cdn.example.com/category/ao.jpg',
        children: [
          {
            id: 'cat-2',
            name: 'Hoodie',
            slug: 'hoodie',
            image_url: 'https://cdn.example.com/category/hoodie.jpg',
          },
        ],
      },
    ]);

    await request(app.getHttpServer())
      .get('/categories/tree')
      .expect(200)
      .expect({
        success: true,
        data: [
          {
            id: 'cat-1',
            name: 'Ao',
            slug: 'ao',
            image_url: 'https://cdn.example.com/category/ao.jpg',
            children: [
              {
                id: 'cat-2',
                name: 'Hoodie',
                slug: 'hoodie',
                image_url: 'https://cdn.example.com/category/hoodie.jpg',
              },
            ],
          },
        ],
      });
  });

  it('GET /categories/:id should return detail without auth (public)', async () => {
    categoriesService.getCategoryById.mockResolvedValue({
      id: 'cat-1',
      name: 'Ao',
      slug: 'ao',
      parent_id: null,
      level: 1,
      image_url: 'https://cdn.example.com/category/ao.jpg',
      is_active: true,
      description: 'Ao nam nu',
    });

    await request(app.getHttpServer())
      .get('/categories/cat-1')
      .expect(200)
      .expect({
        success: true,
        data: {
          id: 'cat-1',
          name: 'Ao',
          slug: 'ao',
          parent_id: null,
          level: 1,
          image_url: 'https://cdn.example.com/category/ao.jpg',
          is_active: true,
          description: 'Ao nam nu',
        },
      });
  });

  it('POST /categories should create category for staff with CATEGORY_MANAGE', async () => {
    categoriesService.createCategory.mockResolvedValue(undefined);

    await request(app.getHttpServer())
      .post('/categories')
      .set('x-role', UserRole.STAFF)
      .set('x-permissions', PermissionCode.CATEGORY_MANAGE)
      .send({
        name: 'Hoodie',
        description: 'Ao hoodie local brand',
        parent_id: '0ebb7971-c0d7-4f2d-883d-f7fded744e2e',
      })
      .expect(201);
  });

  it('PUT /categories/:id should update category for admin', async () => {
    categoriesService.updateCategory.mockResolvedValue(undefined);

    await request(app.getHttpServer())
      .put('/categories/cat-1')
      .set('x-role', UserRole.ADMIN)
      .send({
        name: 'Hoodie Oversize',
        image_url: 'https://cdn.example.com/category/hoodie.jpg',
        is_active: true,
      })
      .expect(200)
      .expect({
        success: true,
        message: 'Category updated successfully',
      });
  });

  it('PATCH /categories/:id should partially update category for admin', async () => {
    categoriesService.updateCategory.mockResolvedValue(undefined);

    await request(app.getHttpServer())
      .patch('/categories/cat-1')
      .set('x-role', UserRole.ADMIN)
      .send({ name: 'Hoodie Oversize' })
      .expect(200)
      .expect({
        success: true,
        message: 'Category updated successfully',
      });

    expect(categoriesService.updateCategory).toHaveBeenCalledWith(
      'cat-1',
      expect.objectContaining({
        name: 'Hoodie Oversize',
      }),
      expect.objectContaining({
        id: 'user-default',
        role: UserRole.ADMIN,
      }),
    );
  });

  it('DELETE /categories/:id should return 403 for staff without CATEGORY_MANAGE', async () => {
    await request(app.getHttpServer())
      .delete('/categories/cat-1')
      .set('x-role', UserRole.STAFF)
      .set('x-permissions', PermissionCode.CATEGORY_READ)
      .expect(403);
  });
});
