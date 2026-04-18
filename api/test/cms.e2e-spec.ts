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
import { CmsApplicationService } from '../src/modules/cms/cms.application.service';
import { CmsPagesController } from '../src/modules/cms/cms-pages.controller';
import { CmsSectionsController } from '../src/modules/cms/cms-sections.controller';

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

describe('CmsController (e2e)', () => {
  let app: INestApplication<App>;
  const cmsApplication = {
    getPublishedPageByKey: jest.fn(),
    listPagesAdmin: jest.fn(),
    getPageAdmin: jest.fn(),
    createPage: jest.fn(),
    addSection: jest.fn(),
    reorderSections: jest.fn(),
    addBlock: jest.fn(),
    updateSection: jest.fn(),
    updateBlock: jest.fn(),
    deleteSection: jest.fn(),
    deleteBlock: jest.fn(),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [CmsPagesController, CmsSectionsController],
      providers: [
        AuthorizationGuard,
        { provide: CmsApplicationService, useValue: cmsApplication },
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

  it('GET /cms/pages/by-key/homepage should be public', async () => {
    cmsApplication.getPublishedPageByKey.mockResolvedValue({
      id: 'page-1',
      key: 'homepage',
      title: 'Homepage',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sections: [],
    });

    const response = await request(app.getHttpServer())
      .get('/cms/pages/by-key/homepage')
      .expect(200);

    const body = response.body as { success: boolean };
    expect(body.success).toBe(true);
    expect(cmsApplication.getPublishedPageByKey).toHaveBeenCalledWith(
      'homepage',
    );
  });

  it('GET /cms/pages should return 403 for staff without CMS_READ', async () => {
    await request(app.getHttpServer())
      .get('/cms/pages')
      .set('x-role', UserRole.STAFF)
      .set('x-permissions', PermissionCode.CATEGORY_READ)
      .expect(403);
  });

  it('GET /cms/pages should succeed for staff with CMS_READ', async () => {
    cmsApplication.listPagesAdmin.mockResolvedValue([]);

    await request(app.getHttpServer())
      .get('/cms/pages')
      .set('x-role', UserRole.STAFF)
      .set('x-permissions', PermissionCode.CMS_READ)
      .expect(200)
      .expect({ success: true, data: [] });
  });
});
