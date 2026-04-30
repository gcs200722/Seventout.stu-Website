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
import type { AuthenticatedUser } from '../../core/auth/auth.types';
import { CurrentUser } from '../../core/auth/current-user.decorator';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import {
  PermissionCode,
  UserRole,
} from '../../core/authorization/authorization.types';
import { RequirePermissions } from '../../core/authorization/decorators/require-permissions.decorator';
import { RequireRoles } from '../../core/authorization/decorators/require-roles.decorator';
import { AuthorizationGuard } from '../../core/authorization/guards/authorization.guard';
import { RequireTenant } from '../../core/context/tenant-context.constants';
import { TenantGuard } from '../../core/context/tenant.guard';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { ListCategoriesQueryDto } from './dto/list-categories.query.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @RequireTenant()
  @UseGuards(TenantGuard)
  @ApiOperation({ summary: 'List categories in flat format (public)' })
  async listCategories(@Query() query: ListCategoriesQueryDto) {
    const categories = await this.categoriesService.listCategories(query);
    return {
      success: true,
      data: categories,
    };
  }

  @Get('tree')
  @RequireTenant()
  @UseGuards(TenantGuard)
  @ApiOperation({ summary: 'List categories in tree format (public)' })
  async listCategoryTree() {
    const categories = await this.categoriesService.listCategoryTree();
    return {
      success: true,
      data: categories,
    };
  }

  @Get(':id')
  @RequireTenant()
  @UseGuards(TenantGuard)
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
  @RequirePermissions(PermissionCode.CATEGORY_MANAGE)
  async createCategory(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() payload: CreateCategoryDto,
  ) {
    await this.categoriesService.createCategory(payload, actor);
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
  @RequirePermissions(PermissionCode.CATEGORY_MANAGE)
  async updateCategory(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body() payload: UpdateCategoryDto,
  ) {
    await this.categoriesService.updateCategory(id, payload, actor);
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
  @RequirePermissions(PermissionCode.CATEGORY_MANAGE)
  async patchCategory(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body() payload: UpdateCategoryDto,
  ) {
    await this.categoriesService.updateCategory(id, payload, actor);
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
  @RequirePermissions(PermissionCode.CATEGORY_MANAGE)
  async deleteCategory(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    await this.categoriesService.softDeleteCategory(id, actor);
    return {
      success: true,
      message: 'Category deleted successfully',
    };
  }
}
