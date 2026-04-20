export const AUDIT_QUEUE_NAME = 'audit';

export const AUDIT_JOB_PERSIST = 'persist_audit_log';

/** Contract: high-level actions stored in audit_logs.action */
export const AuditAction = {
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  STATUS_CHANGE: 'STATUS_CHANGE',
  PRICE_CHANGE: 'PRICE_CHANGE',
  CANCEL: 'CANCEL',
  REFUND: 'REFUND',
  REFUND_INIT: 'REFUND_INIT',
  REFUND_SUCCESS: 'REFUND_SUCCESS',
  ROLE_ASSIGN: 'ROLE_ASSIGN',
  PERMISSION_CHANGE: 'PERMISSION_CHANGE',
  ADJUST: 'ADJUST',
  SYNC: 'SYNC',
  APPLY: 'APPLY',
  PAYMENT_SUCCESS: 'PAYMENT_SUCCESS',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  INVENTORY_ADJUST: 'INVENTORY_ADJUST',
  INVENTORY_DEDUCT: 'INVENTORY_DEDUCT',
  INVENTORY_RESTOCK: 'INVENTORY_RESTOCK',
  INVENTORY_SYNC: 'INVENTORY_SYNC',
  PROMOTION_APPLY: 'PROMOTION_APPLY',
  PROMOTION_REMOVE: 'PROMOTION_REMOVE',
} as const;

export type AuditActionCode = (typeof AuditAction)[keyof typeof AuditAction];

export const AuditEntityType = {
  USER: 'USER',
  ORDER: 'ORDER',
  PRODUCT: 'PRODUCT',
  CATEGORY: 'CATEGORY',
  PROMOTION: 'PROMOTION',
  COUPON: 'COUPON',
  CART: 'CART',
  INVENTORY: 'INVENTORY',
  PAYMENT: 'PAYMENT',
  REFUND: 'REFUND',
  CMS: 'CMS',
  AUTH: 'AUTH',
} as const;

export type AuditEntityTypeCode =
  (typeof AuditEntityType)[keyof typeof AuditEntityType];

export const AuditActorRole = {
  ADMIN: 'ADMIN',
  STAFF: 'STAFF',
  USER: 'USER',
  SYSTEM: 'SYSTEM',
} as const;

export type AuditActorRoleCode =
  (typeof AuditActorRole)[keyof typeof AuditActorRole];
