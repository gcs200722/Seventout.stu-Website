import { InventoryChannel } from '../inventory.types';

export interface ChannelInventorySyncPayload {
  externalProductId: string;
  externalSkuId: string;
  availableStock: number;
}

export interface ChannelInventoryClient {
  readonly channel: InventoryChannel.SHOPEE | InventoryChannel.TIKTOK;
  pushStock(payload: ChannelInventorySyncPayload): Promise<void>;
}
