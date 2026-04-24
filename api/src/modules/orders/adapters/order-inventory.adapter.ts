import { Injectable } from '@nestjs/common';
import { InventoryService } from '../../inventory/inventory.service';
import { OrderInventoryPort } from '../ports/order-inventory.port';

@Injectable()
export class OrderInventoryAdapter implements OrderInventoryPort {
  constructor(private readonly inventoryService: InventoryService) {}

  async reserveStock(
    productVariantId: string,
    quantity: number,
    reason: string,
    orderId?: string,
  ): Promise<void> {
    await this.inventoryService.reserveFromOrder(
      productVariantId,
      quantity,
      reason,
      orderId,
    );
  }

  async releaseStock(
    productVariantId: string,
    quantity: number,
    reason: string,
    orderId?: string,
  ): Promise<void> {
    await this.inventoryService.releaseFromOrder(
      productVariantId,
      quantity,
      reason,
      orderId,
    );
  }

  async commitStockOut(
    productVariantId: string,
    quantity: number,
    reason: string,
    orderId?: string,
  ): Promise<void> {
    await this.inventoryService.commitOutFromOrder(
      productVariantId,
      quantity,
      reason,
      orderId,
    );
  }
}
