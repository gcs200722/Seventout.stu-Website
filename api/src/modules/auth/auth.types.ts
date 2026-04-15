import { UserRole } from '../authorization/authorization.types';

export interface AccessTokenPayload {
  sub: string;
  user_id: string;
  email: string;
  role: UserRole;
  permissions: string[];
}

export interface RefreshTokenPayload {
  sub: string;
  tokenId: string;
  type: 'refresh';
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  permissions: string[];
}
