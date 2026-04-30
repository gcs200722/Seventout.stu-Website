import { Injectable, Logger } from '@nestjs/common';
import {
  ChannelInventoryClient,
  ChannelInventorySyncPayload,
} from '../channel-inventory.client';
import { InventoryChannel } from '../../inventory.types';

@Injectable()
export class ShopeeInventoryClient implements ChannelInventoryClient {
  readonly channel = InventoryChannel.SHOPEE;
  private readonly logger = new Logger(ShopeeInventoryClient.name);

  pushStock(payload: ChannelInventorySyncPayload): Promise<void> {
    this.logger.log(
      `Syncing stock to Shopee product=${payload.externalProductId} sku=${payload.externalSkuId} stock=${payload.availableStock}`,
    );
    return Promise.resolve();
  }
}
