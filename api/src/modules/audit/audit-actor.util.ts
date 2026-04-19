import { UserRole } from '../authorization/authorization.types';
import { AuditActorRole, type AuditActorRoleCode } from './audit.constants';

export function userRoleToAuditActorRole(role: UserRole): AuditActorRoleCode {
  if (role === UserRole.ADMIN) {
    return AuditActorRole.ADMIN;
  }
  if (role === UserRole.STAFF) {
    return AuditActorRole.STAFF;
  }
  return AuditActorRole.USER;
}
