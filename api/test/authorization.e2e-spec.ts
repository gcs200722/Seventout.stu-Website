import {
  CanActivate,
  Controller,
  ExecutionContext,
  Get,
  INestApplication,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { RequireOwnerParam } from '../src/modules/authorization/decorators/require-owner-param.decorator';
import { RequirePermissions } from '../src/modules/authorization/decorators/require-permissions.decorator';
import { RequireRoles } from '../src/modules/authorization/decorators/require-roles.decorator';
import { AuthorizationGuard } from '../src/modules/authorization/guards/authorization.guard';
import { type AuthenticatedUser } from '../src/modules/auth/auth.types';
import {
  PermissionCode,
  UserRole,
} from '../src/modules/authorization/authorization.types';

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
      email: 'test@example.com',
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

@Controller()
@UseGuards(MockJwtAuthGuard, AuthorizationGuard)
class TestAuthorizationController {
  @Get('users')
  @RequireRoles(UserRole.ADMIN)
  getUsers() {
    return { success: true };
  }

  @Get('users/:id')
  @RequireRoles(UserRole.ADMIN, UserRole.USER)
  @RequireOwnerParam('id')
  getUserById() {
    return { success: true };
  }

  @Post('products')
  @RequireRoles(UserRole.ADMIN, UserRole.STAFF)
  @RequirePermissions(PermissionCode.PRODUCT_MANAGE)
  createProduct() {
    return { success: true };
  }
}

describe('Authorization (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [TestAuthorizationController],
      providers: [AuthorizationGuard],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 200 for admin on /users', async () => {
    await request(app.getHttpServer())
      .get('/users')
      .set('x-role', UserRole.ADMIN)
      .expect(200);
  });

  it('returns 403 for staff on /users', async () => {
    const response = await request(app.getHttpServer())
      .get('/users')
      .set('x-role', UserRole.STAFF)
      .expect(403);

    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'You do not have permission to access this resource',
      },
    });
  });

  it('returns 403 when user reads another user profile', async () => {
    await request(app.getHttpServer())
      .get('/users/owner-a')
      .set('x-role', UserRole.USER)
      .set('x-user-id', 'owner-b')
      .expect(403);
  });

  it('returns 201 for staff with PRODUCT_MANAGE permission', async () => {
    await request(app.getHttpServer())
      .post('/products')
      .set('x-role', UserRole.STAFF)
      .set('x-permissions', PermissionCode.PRODUCT_MANAGE)
      .expect(201);
  });

  it('returns 403 for staff without PRODUCT_MANAGE permission', async () => {
    await request(app.getHttpServer())
      .post('/products')
      .set('x-role', UserRole.STAFF)
      .set('x-permissions', PermissionCode.ORDER_MANAGE)
      .expect(403);
  });
});
