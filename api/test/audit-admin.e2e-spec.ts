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
import { AuditAdminController } from '../src/modules/tenant/core/audit/audit-admin.controller';
import { AuditLogService } from '../src/modules/tenant/core/audit/audit-log.service';

type AuditEnvelopeSuccess<T> = {
  success: true;
  data: T;
  pagination?: { total: number };
};

type AuditEnvelopeError = {
  success: false;
};

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

describe('AuditAdminController (e2e)', () => {
  let app: INestApplication<App>;
  const auditLogService = {
    list: jest.fn(),
    getById: jest.fn(),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuditAdminController],
      providers: [{ provide: AuditLogService, useValue: auditLogService }],
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

  it('GET /admin/audit-logs returns 403 for staff without AUDIT_READ', async () => {
    const response = await request(app.getHttpServer())
      .get('/admin/audit-logs')
      .set('x-role', UserRole.STAFF)
      .set('x-user-id', 'staff-1')
      .set('x-permissions', PermissionCode.ORDER_MANAGE)
      .expect(403);

    expect((response.body as AuditEnvelopeError).success).toBe(false);
  });

  it('GET /admin/audit-logs returns 200 for staff with AUDIT_READ', async () => {
    auditLogService.list.mockResolvedValue({
      items: [
        {
          id: 'log-1',
          actor_id: 'a1',
          actor_role: 'ADMIN',
          action: 'LOGIN',
          entity_type: 'AUTH',
          entity_id: 'a1',
          metadata: {},
          created_at: new Date().toISOString(),
        },
      ],
      total: 1,
    });

    await request(app.getHttpServer())
      .get('/admin/audit-logs')
      .set('x-role', UserRole.STAFF)
      .set('x-user-id', 'staff-1')
      .set('x-permissions', PermissionCode.AUDIT_READ)
      .expect(200)
      .expect((res) => {
        const body = res.body as AuditEnvelopeSuccess<unknown[]>;
        expect(body.success).toBe(true);
        expect(body.data).toHaveLength(1);
        expect(body.pagination?.total).toBe(1);
      });
  });

  it('GET /admin/audit-logs/:id returns detail', async () => {
    const logId = '11111111-1111-4111-8111-111111111111';
    auditLogService.getById.mockResolvedValue({
      id: logId,
      actor_id: 'a1',
      actor_role: 'ADMIN',
      action: 'UPDATE',
      entity_type: 'USER',
      entity_id: 'u1',
      metadata: {},
      created_at: new Date().toISOString(),
      before: { phone: '1' },
      after: { phone: '2' },
    });

    await request(app.getHttpServer())
      .get(`/admin/audit-logs/${logId}`)
      .set('x-role', UserRole.ADMIN)
      .expect(200)
      .expect((res) => {
        const body = res.body as AuditEnvelopeSuccess<{
          before: Record<string, unknown>;
        }>;
        expect(body.data.before).toEqual({ phone: '1' });
      });
  });
});
