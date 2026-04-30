import { Injectable, Logger } from '@nestjs/common';
import { WishlistEventOutboxEntity } from '../entities/wishlist-event-outbox.entity';

@Injectable()
export class WishlistEventDispatcherService {
  private readonly logger = new Logger(WishlistEventDispatcherService.name);

  dispatch(event: WishlistEventOutboxEntity): Promise<void> {
    this.logger.debug(
      `Wishlist outbox dispatched: ${event.eventType} id=${event.id}`,
    );
    return Promise.resolve();
  }
}
