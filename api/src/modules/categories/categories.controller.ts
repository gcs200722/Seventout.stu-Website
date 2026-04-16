import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionCode, UserRole } from '../authorization/authorization.types';
import { RequirePermissions } from '../authorization/decorators/require-permissions.decorator';
import { RequireRoles } from '../authorization/decorators/require-roles.decorator';
import { AuthorizationGuard } from '../authorization/guards/authorization.guard';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { ListCategoriesQueryDto } from './dto/list-categories.query.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'List categories in flat format (public)' })
  async listCategories(@Query() query: ListCategoriesQueryDto) {
    const categories = await this.categoriesService.listCategories(query);
    return {
      success: true,
      data: categories,
    };
  }

  @Get('tree')
  @ApiOperation({ summary: 'List categories in tree format (public)' })
  async listCategoryTree() {
    const categories = await this.categoriesService.listCategoryTree();
    return {
      success: true,
      data: categories,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category detail (public)' })
  async getCategoryById(@Param('id') id: string) {
    const category = await this.categoriesService.getCategoryById(id);
    return {
      success: true,
      data: category,
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard, AuthorizationGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create category' })
  @RequireRoles(UserRole.ADMIN, UserRole.STAFF)
  @RequirePermissions(PermissionCode.CATEGORY_MANAGER)
  async createCategory(@Body() payload: CreateCategoryDto) {
    await this.categoriesService.createCategory(payload);
    return {
      success: true,
      message: 'Category created successfully',
    };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, AuthorizationGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update category' })
  @RequireRoles(UserRole.ADMIN, UserRole.STAFF)
  @RequirePermissions(PermissionCode.CATEGORY_MANAGER)
  async updateCategory(
    @Param('id') id: string,
    @Body() payload: UpdateCategoryDto,
  ) {
    await this.categoriesService.updateCategory(id, payload);
    return {
      success: true,
      message: 'Category updated successfully',
    };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AuthorizationGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Partially update category' })
  @RequireRoles(UserRole.ADMIN, UserRole.STAFF)
  @RequirePermissions(PermissionCode.CATEGORY_MANAGER)
  async patchCategory(
    @Param('id') id: string,
    @Body() payload: UpdateCategoryDto,
  ) {
    await this.categoriesService.updateCategory(id, payload);
    return {
      success: true,
      message: 'Category updated successfully',
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AuthorizationGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Soft delete category' })
  @RequireRoles(UserRole.ADMIN, UserRole.STAFF)
  @RequirePermissions(PermissionCode.CATEGORY_MANAGER)
  async deleteCategory(@Param('id') id: string) {
    await this.categoriesService.softDeleteCategory(id);
    return {
      success: true,
      message: 'Category deleted successfully',
    };
  }
}
