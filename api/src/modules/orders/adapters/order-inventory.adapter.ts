import { Injectable } from '@nestjs/common';
import { InventoryService } from '../../inventory/inventory.service';
import { OrderInventoryPort } from '../ports/order-inventory.port';

@Injectable()
export class OrderInventoryAdapter implements OrderInventoryPort {
  constructor(private readonly inventoryService: InventoryService) {}

  async reserveStock(
    productId: string,
    quantity: number,
    reason: string,
    orderId?: string,
  ): Promise<void> {
    await this.inventoryService.reserveFromOrder(
      productId,
      quantity,
      reason,
      orderId,
    );
  }

  async releaseStock(
    productId: string,
    quantity: number,
    reason: string,
    orderId?: string,
  ): Promise<void> {
    await this.inventoryService.releaseFromOrder(
      productId,
      quantity,
      reason,
      orderId,
    );
  }

  async commitStockOut(
    productId: string,
    quantity: number,
    reason: string,
    orderId?: string,
  ): Promise<void> {
    await this.inventoryService.commitOutFromOrder(
      productId,
      quantity,
      reason,
      orderId,
    );
  }
}
