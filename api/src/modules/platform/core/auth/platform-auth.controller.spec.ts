import { PlatformAuthController } from './platform-auth.controller';
import { PlatformAuthService } from './platform-auth.service';
import { UserRole } from '../../../tenant/core/authorization/authorization.types';
import type { Response } from 'express';

describe('PlatformAuthController', () => {
  let controller: PlatformAuthController;
  let service: jest.Mocked<
    Pick<
      PlatformAuthService,
      | 'login'
      | 'register'
      | 'refreshToken'
      | 'logout'
      | 'getMe'
      | 'assertGoogleState'
      | 'loginWithGoogle'
      | 'buildGoogleSuccessRedirect'
      | 'buildGoogleFailureRedirect'
    >
  >;

  beforeEach(() => {
    service = {
      login: jest.fn(),
      register: jest.fn(),
      refreshToken: jest.fn(),
      logout: jest.fn(),
      getMe: jest.fn(),
      assertGoogleState: jest.fn(),
      loginWithGoogle: jest.fn(),
      buildGoogleSuccessRedirect: jest.fn().mockReturnValue('http://localhost:3000/platform/success'),
      buildGoogleFailureRedirect: jest.fn().mockReturnValue('http://localhost:3000/platform/fail'),
    };
    controller = new PlatformAuthController(service as PlatformAuthService);
  });

  it('should_return_tokens_on_login', async () => {
    service.login.mockResolvedValue({
      access_token: 'a',
      refresh_token: 'r',
    });
    const result = await controller.login({
      email: 'admin@example.com',
      password: 'password123',
    });
    expect(result).toEqual({
      success: true,
      data: { access_token: 'a', refresh_token: 'r' },
    });
  });

  it('should_return_profile_on_me', async () => {
    service.getMe.mockResolvedValue({
      id: 'u1',
      email: 'admin@example.com',
      role: UserRole.ADMIN,
      platform_permissions: [],
    });
    const result = await controller.getMe({
      id: 'u1',
      email: 'admin@example.com',
      role: UserRole.ADMIN,
      platformPermissions: [],
      tokenScope: 'platform',
    });
    expect(result).toEqual({
      success: true,
      data: {
        id: 'u1',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
        platform_permissions: [],
      },
    });
  });

  it('should_logout_platform_user', async () => {
    service.logout.mockResolvedValue(undefined);
    const result = await controller.logout({
      id: 'u1',
      email: 'admin@example.com',
      role: UserRole.ADMIN,
      platformPermissions: [],
      tokenScope: 'platform',
    });
    expect(service.logout).toHaveBeenCalledWith('u1');
    expect(result).toEqual({ success: true, message: 'Logout successful' });
  });

  it('should_register_platform_user', async () => {
    service.register.mockResolvedValue({ user_id: 'platform-user-1' });
    const result = await controller.register({
      first_name: 'Platform',
      last_name: 'Operator',
      email: 'operator@example.com',
      password: 'password123',
      phone: '0326373527',
    });
    expect(result).toEqual({
      success: true,
      data: { user_id: 'platform-user-1' },
    });
  });

  it('should_redirect_to_success_url_when_google_callback_success', async () => {
    service.loginWithGoogle.mockResolvedValue({
      access_token: 'platform-access-token',
      refresh_token: 'platform-refresh-token',
    });
    const redirect = jest.fn();
    const response = { redirect } as unknown as Response;

    await controller.googleAuthCallback(
      {
        user: {
          googleId: 'google-1',
          email: 'operator@example.com',
          firstName: 'Platform',
          lastName: 'Operator',
        },
      } as never,
      'state-token',
      response,
    );

    expect(service.assertGoogleState).toHaveBeenCalledWith('state-token');
    expect(redirect).toHaveBeenCalledWith(
      'http://localhost:3000/platform/success',
    );
  });
});
