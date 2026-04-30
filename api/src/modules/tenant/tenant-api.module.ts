import { Module } from '@nestjs/common';
import { AddressModule } from './core/address/address.module';
import { AuditModule } from './core/audit/audit.module';
import { AuthModule } from './core/auth/auth.module';
import { NotificationModule } from './core/notification/notification.module';
import { QueueModule } from './core/queue/queue.module';
import { StorageModule } from './core/storage/storage.module';
import { UsersModule } from './core/users/users.module';
import { CartModule } from './extensions/cart/cart.module';
import { CategoriesModule } from './extensions/categories/categories.module';
import { CmsModule } from './extensions/cms/cms.module';
import { DashboardModule } from './extensions/dashboard/dashboard.module';
import { FulfillmentModule } from './extensions/fulfillment/fulfillment.module';
import { InventoryModule } from './extensions/inventory/inventory.module';
import { OrdersModule } from './extensions/orders/orders.module';
import { PaymentsModule } from './extensions/payments/payments.module';
import { ProductsModule } from './extensions/products/products.module';
import { RefundsModule } from './extensions/refunds/refunds.module';
import { ReturnsModule } from './extensions/returns/returns.module';
import { ReviewsModule } from './extensions/reviews/reviews.module';
import { WishlistModule } from './extensions/wishlist/wishlist.module';

@Module({
  imports: [
    AuthModule,
    AddressModule,
    CategoriesModule,
    CartModule,
    UsersModule,
    ProductsModule,
    InventoryModule,
    NotificationModule,
    FulfillmentModule,
    OrdersModule,
    PaymentsModule,
    ReturnsModule,
    RefundsModule,
    QueueModule,
    StorageModule,
    CmsModule,
    ReviewsModule,
    WishlistModule,
    AuditModule,
    DashboardModule,
  ],
})
export class TenantApiModule {}
