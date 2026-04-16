import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '../authorization/authorization.module';
import { CategoryEntity } from '../categories/category.entity';
import { StorageModule } from '../storage/storage.module';
import { ProductImageEntity } from './product-image.entity';
import { ProductEntity } from './product.entity';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProductEntity,
      ProductImageEntity,
      CategoryEntity,
    ]),
    AuthorizationModule,
    StorageModule,
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
