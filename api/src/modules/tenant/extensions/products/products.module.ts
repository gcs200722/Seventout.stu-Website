import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '../../core/authorization/authorization.module';
import { CategoryEntity } from '../categories/category.entity';
import { InventoryEntity } from '../inventory/entities/inventory.entity';
import { MarketingModule } from '../marketing/marketing.module';
import { AuditModule } from '../../core/audit/audit.module';
import { StorageModule } from '../../core/storage/storage.module';
import { ProductImageEntity } from './product-image.entity';
import { ProductEntity } from './product.entity';
import { ProductVariantEntity } from './product-variant.entity';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProductEntity,
      ProductImageEntity,
      ProductVariantEntity,
      CategoryEntity,
      InventoryEntity,
    ]),
    AuthorizationModule,
    AuditModule,
    MarketingModule,
    StorageModule,
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
