import { UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { UserRole } from '../authorization/authorization.types';
import { AuthController } from './auth.controller';
import type { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<
    Pick<
      AuthService,
      | 'assertGoogleState'
      | 'loginWithGoogle'
      | 'switchTenant'
      | 'buildGoogleSuccessRedirect'
      | 'buildGoogleFailureRedirect'
    >
  >;

  beforeEach(() => {
    authService = {
      assertGoogleState: jest.fn(),
      loginWithGoogle: jest.fn(),
      switchTenant: jest.fn(),
      buildGoogleSuccessRedirect: jest
        .fn()
        .mockReturnValue('http://localhost:3000/success'),
      buildGoogleFailureRedirect: jest
        .fn()
        .mockReturnValue('http://localhost:3000/fail'),
    };

    controller = new AuthController(authService as unknown as AuthService);
  });

  it('should_redirect_to_success_url_when_google_callback_success', async () => {
    authService.loginWithGoogle.mockResolvedValue({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
    });

    const request = {
      user: {
        googleId: 'google-1',
        email: 'user@example.com',
        firstName: 'User',
        lastName: 'Name',
      },
    } as Request;
    const redirect = jest.fn();
    const response = { redirect } as unknown as Response;

    await controller.googleAuthCallback(request, 'state-token', response);

    expect(authService.assertGoogleState).toHaveBeenCalledWith('state-token');
    expect(authService.loginWithGoogle).toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith('http://localhost:3000/success');
  });

  it('should_redirect_to_failure_url_when_google_profile_missing', async () => {
    const request = {} as Request;
    const redirect = jest.fn();
    const response = { redirect } as unknown as Response;

    await controller.googleAuthCallback(request, 'state-token', response);

    expect(authService.buildGoogleFailureRedirect).toHaveBeenCalledWith(
      'oauth_failed',
    );
    expect(redirect).toHaveBeenCalledWith('http://localhost:3000/fail');
  });

  it('should_redirect_to_failure_url_when_state_is_invalid', async () => {
    authService.assertGoogleState.mockImplementation(() => {
      throw new UnauthorizedException('Invalid OAuth state');
    });

    const request = {
      user: {
        googleId: 'google-1',
        email: 'user@example.com',
        firstName: 'User',
        lastName: 'Name',
      },
    } as Request;
    const redirect = jest.fn();
    const response = { redirect } as unknown as Response;

    await controller.googleAuthCallback(request, 'invalid-state', response);

    expect(authService.buildGoogleFailureRedirect).toHaveBeenCalledWith(
      'oauth_failed',
    );
    expect(redirect).toHaveBeenCalledWith('http://localhost:3000/fail');
  });

  it('should_return_rotated_tokens_when_switch_tenant_success', async () => {
    authService.switchTenant.mockResolvedValue({
      access_token: 'access-switched',
      refresh_token: 'refresh-switched',
    });

    const result = await controller.switchTenant(
      {
        id: 'user-1',
        email: 'user@example.com',
        role: UserRole.USER,
        permissions: [],
      },
      { tenant_id: '13fbf749-0ddd-4dd8-a299-e0dc8f27b44a' },
    );

    expect(authService.switchTenant).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-1' }),
      '13fbf749-0ddd-4dd8-a299-e0dc8f27b44a',
    );
    expect(result).toEqual({
      success: true,
      data: {
        access_token: 'access-switched',
        refresh_token: 'refresh-switched',
      },
    });
  });
});
