import { Module } from '@nestjs/common';
import { AuthorizationModule } from '../authorization/authorization.module';
import { ProductsController } from './products.controller';

@Module({
  imports: [AuthorizationModule],
  controllers: [ProductsController],
})
export class ProductsModule {}
