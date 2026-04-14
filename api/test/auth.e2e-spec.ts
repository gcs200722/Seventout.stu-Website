import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuthController } from '../src/modules/auth/auth.controller';
import { AuthService } from '../src/modules/auth/auth.service';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';

describe('AuthController (e2e)', () => {
  let app: INestApplication<App>;
  const authService = {
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    getMe: jest.fn(),
    refreshToken: jest.fn(),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: {
          switchToHttp: () => {
            getRequest: () => { user: { id: string; email: string } };
          };
        }) => {
          const req = context.switchToHttp().getRequest();
          req.user = { id: 'user-1', email: 'john@example.com' };
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });

  it('POST /auth/register', async () => {
    authService.register.mockResolvedValue({ user_id: 'user-1' });

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        first_name: 'Le',
        last_name: 'Tung',
        email: 'john@example.com',
        password: 'password123',
        phone: '0326373527',
      })
      .expect(201)
      .expect({
        success: true,
        data: { user_id: 'user-1' },
        message: 'User registered successfully',
      });
  });

  it('POST /auth/login', async () => {
    authService.login.mockResolvedValue({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
    });

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'john@example.com',
        password: 'password123',
      })
      .expect(200)
      .expect({
        success: true,
        data: {
          access_token: 'access-token',
          refresh_token: 'refresh-token',
        },
        message: 'Login successful',
      });
  });

  it('POST /auth/logout', async () => {
    authService.logout.mockResolvedValue(undefined);

    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', 'Bearer access-token')
      .expect(200)
      .expect({
        success: true,
        message: 'Logout successful',
      });
  });

  it('GET /auth/me', async () => {
    authService.getMe.mockResolvedValue({
      id: 'user-1',
      first_name: 'Le',
      last_name: 'Tung',
      email: 'john@example.com',
      phone: '0326373527',
    });

    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', 'Bearer access-token')
      .expect(200)
      .expect({
        success: true,
        data: {
          id: 'user-1',
          first_name: 'Le',
          last_name: 'Tung',
          email: 'john@example.com',
          phone: '0326373527',
        },
      });
  });

  it('POST /auth/refresh-token', async () => {
    authService.refreshToken.mockResolvedValue({
      access_token: 'new-access-token',
      refresh_token: 'new-refresh-token',
    });

    await request(app.getHttpServer())
      .post('/auth/refresh-token')
      .send({
        refresh_token: 'refresh-token',
      })
      .expect(200)
      .expect({
        success: true,
        data: {
          access_token: 'new-access-token',
        },
      });
  });
});
