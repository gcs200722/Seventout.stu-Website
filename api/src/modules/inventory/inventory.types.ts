export enum InventoryChannel {
  INTERNAL = 'internal',
  SHOPEE = 'shopee',
  TIKTOK = 'tiktok',
}

export enum ExternalInventoryChannel {
  SHOPEE = InventoryChannel.SHOPEE,
  TIKTOK = InventoryChannel.TIKTOK,
}

export enum InventoryMovementType {
  IN = 'IN',
  OUT = 'OUT',
  RESERVE = 'RESERVE',
  RELEASE = 'RELEASE',
}

export enum InventoryAdjustType {
  IN = InventoryMovementType.IN,
  OUT = InventoryMovementType.OUT,
}

export enum InventoryJobName {
  SYNC_STOCK = 'inventory.sync.stock',
  WEBHOOK_EVENT = 'inventory.webhook.event',
}
