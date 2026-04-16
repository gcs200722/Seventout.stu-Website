export enum UserRole {
  ADMIN = 'ADMIN',
  STAFF = 'STAFF',
  USER = 'USER',
}

export enum PermissionCode {
  /** Create/update/delete catalog products (external docs may call this PRODUCT_MANAGER). */
  PRODUCT_MANAGE = 'PRODUCT_MANAGE',
  ORDER_MANAGE = 'ORDER_MANAGE',
  USER_READ = 'USER_READ',
  CATEGORY_READ = 'CATEGORY_READ',
  CATEGORY_MANAGE = 'CATEGORY_MANAGE',
  INVENTORY_READ = 'INVENTORY_READ',
  INVENTORY_MANAGE = 'INVENTORY_MANAGE',
  CART_READ = 'CART_READ',
  CART_MANAGE = 'CART_MANAGE',
}

export const AUTHZ_ROLES_KEY = 'authz_roles';
export const AUTHZ_PERMISSIONS_KEY = 'authz_permissions';
export const AUTHZ_OWNER_PARAM_KEY = 'authz_owner_param';
