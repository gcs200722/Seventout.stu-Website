import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateProductDto } from './create-product.dto';
import { ListProductsQueryDto, ProductSort } from './list-products.query.dto';
import { UpdateProductDto } from './update-product.dto';

describe('Products DTO validation', () => {
  it('transforms and validates create dto', async () => {
    const dto = plainToInstance(CreateProductDto, {
      name: '  Hoodie  ',
      description: '  Mo ta  ',
      price: '120000',
      category_id: '78ff6607-8c95-4eab-981e-3236d2b1d6f4',
      images: '["https://cdn.example.com/1.jpg"]',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.name).toBe('Hoodie');
    expect(dto.description).toBe('Mo ta');
    expect(dto.price).toBe(120000);
    expect(dto.images).toEqual(['https://cdn.example.com/1.jpg']);
  });

  it('rejects invalid create dto values', async () => {
    const dto = plainToInstance(CreateProductDto, {
      name: '',
      description: '',
      price: -1,
      category_id: 'invalid',
      images: ['not-url'],
    });

    const errors = await validate(dto);
    const props = errors.map((item) => item.property);

    expect(props).toEqual(
      expect.arrayContaining([
        'name',
        'description',
        'price',
        'category_id',
        'images',
      ]),
    );
  });

  it('transforms query dto values', async () => {
    const dto = plainToInstance(ListProductsQueryDto, {
      page: '2',
      limit: '20',
      keyword: '  hoodie  ',
      is_active: 'true',
      sort: ProductSort.PRICE_ASC,
      min_price: '100',
      max_price: '200',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(20);
    expect(dto.keyword).toBe('hoodie');
    expect(dto.is_active).toBe(true);
    expect(dto.min_price).toBe(100);
    expect(dto.max_price).toBe(200);
  });

  it('rejects invalid sort in query dto', async () => {
    const dto = plainToInstance(ListProductsQueryDto, {
      sort: 'random-sort',
    });
    const errors = await validate(dto);
    expect(errors.map((item) => item.property)).toContain('sort');
  });

  it('transforms update dto booleans and images', async () => {
    const dto = plainToInstance(UpdateProductDto, {
      is_active: 'false',
      images: 'https://cdn.example.com/2.jpg',
      main_image_index: '1',
    });
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.is_active).toBe(false);
    expect(dto.images).toEqual(['https://cdn.example.com/2.jpg']);
    expect(dto.main_image_index).toBe(1);
  });
});
