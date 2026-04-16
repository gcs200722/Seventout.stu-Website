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
import { UsersController } from '../src/modules/users/users.controller';
import { UsersService } from '../src/modules/users/users.service';

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

describe('UsersController (e2e)', () => {
  let app: INestApplication<App>;
  const usersService = {
    listUsers: jest.fn(),
    getUserById: jest.fn(),
    updateUser: jest.fn(),
    softDeleteUser: jest.fn(),
    updateUserRole: jest.fn(),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        AuthorizationGuard,
        { provide: UsersService, useValue: usersService },
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

  it('GET /users should return user list for staff with USER_READ', async () => {
    usersService.listUsers.mockResolvedValue([
      {
        id: 'user-1',
        first_name: 'Le',
        last_name: 'Tung',
        email: 'user1@example.com',
        phone: '0326373527',
        role: UserRole.USER,
      },
    ]);

    const response = await request(app.getHttpServer())
      .get('/users?page=2&limit=5')
      .set('x-role', UserRole.STAFF)
      .set('x-permissions', PermissionCode.USER_READ)
      .expect(200);

    expect(response.body).toEqual({
      success: true,
      data: [
        {
          id: 'user-1',
          first_name: 'Le',
          last_name: 'Tung',
          email: 'user1@example.com',
          phone: '0326373527',
          role: UserRole.USER,
        },
      ],
    });
    expect(usersService.listUsers).toHaveBeenCalledWith({ page: 2, limit: 5 });
  });

  it('GET /users/:id should return profile for owner user', async () => {
    usersService.getUserById.mockResolvedValue({
      id: 'user-1',
      first_name: 'Le',
      last_name: 'Tung',
      email: 'user1@example.com',
      phone: '0326373527',
      role: UserRole.USER,
    });

    await request(app.getHttpServer())
      .get('/users/user-1')
      .set('x-role', UserRole.USER)
      .set('x-user-id', 'user-1')
      .expect(200)
      .expect({
        success: true,
        data: {
          id: 'user-1',
          first_name: 'Le',
          last_name: 'Tung',
          email: 'user1@example.com',
          phone: '0326373527',
          role: UserRole.USER,
        },
      });
  });

  it('PUT /users/:id should update owner profile', async () => {
    usersService.updateUser.mockResolvedValue(undefined);

    await request(app.getHttpServer())
      .put('/users/user-1')
      .set('x-role', UserRole.USER)
      .set('x-user-id', 'user-1')
      .send({
        first_name: 'Le',
        last_name: 'Thanh Tung',
        phone: '0326373527',
      })
      .expect(200)
      .expect({
        success: true,
        message: 'User updated successfully',
      });
  });

  it('PATCH /users/:id should partially update owner profile', async () => {
    usersService.updateUser.mockResolvedValue(undefined);

    await request(app.getHttpServer())
      .patch('/users/user-1')
      .set('x-role', UserRole.USER)
      .set('x-user-id', 'user-1')
      .send({ phone: '0326373527' })
      .expect(200)
      .expect({
        success: true,
        message: 'User updated successfully',
      });

    expect(usersService.updateUser).toHaveBeenCalledWith('user-1', {
      phone: '0326373527',
    });
  });

  it('DELETE /users/:id should soft delete user for admin', async () => {
    usersService.softDeleteUser.mockResolvedValue(undefined);

    await request(app.getHttpServer())
      .delete('/users/user-2')
      .set('x-role', UserRole.ADMIN)
      .expect(200)
      .expect({
        success: true,
        message: 'User deleted successfully',
      });
  });

  it('PATCH /users/:id/role should update role for admin', async () => {
    usersService.updateUserRole.mockResolvedValue(undefined);

    await request(app.getHttpServer())
      .patch('/users/user-2/role')
      .set('x-role', UserRole.ADMIN)
      .send({ role: UserRole.STAFF })
      .expect(200)
      .expect({
        success: true,
        message: 'Role updated successfully',
      });
  });

  it('GET /users should return 403 for staff without USER_READ permission', async () => {
    const response = await request(app.getHttpServer())
      .get('/users')
      .set('x-role', UserRole.STAFF)
      .expect(403);

    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Missing required permission: USER_READ',
        details: {
          reason: 'MISSING_PERMISSION',
          current_role: UserRole.STAFF,
          required_permissions: [PermissionCode.USER_READ],
          missing_permission: PermissionCode.USER_READ,
        },
      },
    });
  });
});
