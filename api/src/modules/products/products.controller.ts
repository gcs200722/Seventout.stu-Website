import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionCode, UserRole } from '../authorization/authorization.types';
import { RequirePermissions } from '../authorization/decorators/require-permissions.decorator';
import { RequireRoles } from '../authorization/decorators/require-roles.decorator';
import { AuthorizationGuard } from '../authorization/guards/authorization.guard';
import { CreateProductDto } from './dto/create-product.dto';
import { ListProductStocksQueryDto } from './dto/list-product-stocks.query.dto';
import { ListProductsQueryDto } from './dto/list-products.query.dto';
import { ProductsByIdsDto } from './dto/products-by-ids.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

type UploadedImageFile = {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
};

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List products (public, filters + pagination)' })
  async listProducts(@Query() query: ListProductsQueryDto) {
    const { items, total } = await this.productsService.listProducts(query);
    return {
      success: true,
      data: items,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
      },
    };
  }

  @Get('stocks')
  @ApiOperation({ summary: 'Get stocks for multiple products (public)' })
  async getProductStocks(@Query() query: ListProductStocksQueryDto) {
    return {
      success: true,
      data: await this.productsService.getProductStocks(query.ids),
    };
  }

  @Post('by-ids')
  @HttpCode(200)
  @ApiOperation({ summary: 'Get multiple product details by id (public)' })
  async getProductsByIds(@Body() body: ProductsByIdsDto) {
    const data = await this.productsService.getProductsByIdsPublic(body.ids);
    return { success: true, data };
  }

  @Get(':id/stock')
  @ApiOperation({ summary: 'Get product stock (public)' })
  async getProductStock(@Param('id', ParseUUIDPipe) id: string) {
    return {
      success: true,
      data: await this.productsService.getProductStockById(id),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product detail (public)' })
  async getProductById(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.productsService.getProductById(id);
    return {
      success: true,
      data,
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard, AuthorizationGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create product' })
  @RequireRoles(UserRole.ADMIN, UserRole.STAFF)
  @RequirePermissions(PermissionCode.PRODUCT_MANAGE)
  @UseInterceptors(FilesInterceptor('image_files', 10))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        price: { type: 'number' },
        category_id: { type: 'string', format: 'uuid' },
        images: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional image URLs',
        },
        image_files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
      required: ['name', 'description', 'price', 'category_id'],
    },
  })
  async createProduct(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() payload: CreateProductDto,
    @UploadedFiles() files: UploadedImageFile[],
  ) {
    await this.productsService.createProduct(payload, files ?? [], actor);
    return {
      success: true,
      message: 'Product created successfully',
    };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AuthorizationGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update product' })
  @RequireRoles(UserRole.ADMIN, UserRole.STAFF)
  @RequirePermissions(PermissionCode.PRODUCT_MANAGE)
  @UseInterceptors(FilesInterceptor('image_files', 10))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        price: { type: 'number' },
        is_active: { type: 'boolean' },
        main_image_index: {
          type: 'number',
          description: 'Index of image to use as main thumbnail',
        },
        images: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Optional URLs list to replace current images (can combine with uploaded files).',
        },
        image_files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  async updateProduct(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() payload: UpdateProductDto,
    @UploadedFiles() files: UploadedImageFile[],
  ) {
    await this.productsService.updateProduct(id, payload, files ?? [], actor);
    return {
      success: true,
      message: 'Product updated successfully',
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AuthorizationGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Soft delete product' })
  @RequireRoles(UserRole.ADMIN, UserRole.STAFF)
  @RequirePermissions(PermissionCode.PRODUCT_MANAGE)
  async softDeleteProduct(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.productsService.softDeleteProduct(id, actor);
    return {
      success: true,
      message: 'Product deleted successfully',
    };
  }
}
