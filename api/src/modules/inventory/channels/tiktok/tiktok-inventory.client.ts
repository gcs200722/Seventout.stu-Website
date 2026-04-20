import { Injectable, Logger } from '@nestjs/common';
import {
  ChannelInventoryClient,
  ChannelInventorySyncPayload,
} from '../channel-inventory.client';
import { InventoryChannel } from '../../inventory.types';

@Injectable()
export class TiktokInventoryClient implements ChannelInventoryClient {
  readonly channel = InventoryChannel.TIKTOK;
  private readonly logger = new Logger(TiktokInventoryClient.name);

  pushStock(payload: ChannelInventorySyncPayload): Promise<void> {
    this.logger.log(
      `Syncing stock to TikTok product=${payload.externalProductId} sku=${payload.externalSkuId} stock=${payload.availableStock}`,
    );
    return Promise.resolve();
  }
}
