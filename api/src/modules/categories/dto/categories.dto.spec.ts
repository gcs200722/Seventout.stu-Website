import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateCategoryDto } from './create-category.dto';
import { ListCategoriesQueryDto } from './list-categories.query.dto';
import { UpdateCategoryDto } from './update-category.dto';

describe('Categories DTO validation', () => {
  it('transforms and validates create dto', async () => {
    const dto = plainToInstance(CreateCategoryDto, {
      name: '  Hoodie  ',
      description: '  Desc  ',
      parent_id: '78ff6607-8c95-4eab-981e-3236d2b1d6f4',
      image_url: 'https://cdn.example.com/cat.jpg',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.name).toBe('Hoodie');
    expect(dto.description).toBe('Desc');
  });

  it('rejects invalid create dto payload', async () => {
    const dto = plainToInstance(CreateCategoryDto, {
      name: '',
      parent_id: 'bad-uuid',
      image_url: 'invalid-url',
    });
    const errors = await validate(dto);
    const props = errors.map((item) => item.property);

    expect(props).toEqual(
      expect.arrayContaining(['name', 'parent_id', 'image_url']),
    );
  });

  it('transforms list query parent_id null and validates limits', async () => {
    const dto = plainToInstance(ListCategoriesQueryDto, {
      page: '2',
      limit: '30',
      parent_id: 'null',
    });
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(30);
    expect(dto.parent_id).toBeNull();
  });

  it('rejects invalid list query', async () => {
    const dto = plainToInstance(ListCategoriesQueryDto, {
      page: '0',
      limit: '1000',
      parent_id: 'invalid',
    });
    const errors = await validate(dto);
    const props = errors.map((item) => item.property);

    expect(props).toEqual(
      expect.arrayContaining(['page', 'limit', 'parent_id']),
    );
  });

  it('validates update dto', async () => {
    const dto = plainToInstance(UpdateCategoryDto, {
      name: '  New Name  ',
      is_active: true,
      image_url: 'https://cdn.example.com/new.jpg',
    });
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.name).toBe('New Name');
  });
});
