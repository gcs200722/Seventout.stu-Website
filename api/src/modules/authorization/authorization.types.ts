export enum UserRole {
  ADMIN = 'ADMIN',
  STAFF = 'STAFF',
  USER = 'USER',
}

export enum PermissionCode {
  PRODUCT_MANAGE = 'PRODUCT_MANAGE',
  ORDER_MANAGE = 'ORDER_MANAGE',
  USER_READ = 'USER_READ',
}

export const AUTHZ_ROLES_KEY = 'authz_roles';
export const AUTHZ_PERMISSIONS_KEY = 'authz_permissions';
export const AUTHZ_OWNER_PARAM_KEY = 'authz_owner_param';
