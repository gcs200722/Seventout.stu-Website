import { CanActivate } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthorizationGuard } from '../authorization/guards/authorization.guard';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

const allowGuard: CanActivate = { canActivate: () => true };

describe('CategoriesController', () => {
  let controller: CategoriesController;
  const categoriesService = {
    listCategories: jest.fn(),
    listCategoryTree: jest.fn(),
    getCategoryById: jest.fn(),
    createCategory: jest.fn(),
    updateCategory: jest.fn(),
    softDeleteCategory: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [
        {
          provide: CategoriesService,
          useValue: categoriesService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(allowGuard)
      .overrideGuard(AuthorizationGuard)
      .useValue(allowGuard)
      .compile();

    controller = module.get<CategoriesController>(CategoriesController);
  });

  it('GET listCategories returns envelope', async () => {
    categoriesService.listCategories.mockResolvedValue([]);
    const result = await controller.listCategories({
      page: 1,
      limit: 10,
    } as never);
    expect(result).toEqual({ success: true, data: [] });
    expect(categoriesService.listCategories).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
    });
  });

  it('GET tree returns envelope', async () => {
    categoriesService.listCategoryTree.mockResolvedValue([]);
    const result = await controller.listCategoryTree();
    expect(result).toEqual({ success: true, data: [] });
  });

  it('GET detail returns envelope', async () => {
    categoriesService.getCategoryById.mockResolvedValue({
      id: 'id-1',
      name: 'A',
      slug: 'a',
      parent_id: null,
      level: 1,
      image_url: '',
      is_active: true,
      description: '',
    });
    const result = await controller.getCategoryById('id-1');
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ id: 'id-1' });
  });

  it('POST createCategory returns message', async () => {
    categoriesService.createCategory.mockResolvedValue(undefined);
    const result = await controller.createCategory({
      name: 'Cat',
    } as never);
    expect(result).toEqual({
      success: true,
      message: 'Category created successfully',
    });
  });

  it('PUT updateCategory returns message', async () => {
    categoriesService.updateCategory.mockResolvedValue(undefined);
    const result = await controller.updateCategory('id-1', {
      name: 'X',
    } as never);
    expect(result.message).toBe('Category updated successfully');
  });

  it('PATCH patchCategory delegates to updateCategory', async () => {
    categoriesService.updateCategory.mockResolvedValue(undefined);
    await controller.patchCategory('id-1', { is_active: false } as never);
    expect(categoriesService.updateCategory).toHaveBeenCalledWith('id-1', {
      is_active: false,
    });
  });

  it('DELETE deleteCategory returns message', async () => {
    categoriesService.softDeleteCategory.mockResolvedValue(undefined);
    const result = await controller.deleteCategory('id-1');
    expect(result.message).toBe('Category deleted successfully');
  });
});
