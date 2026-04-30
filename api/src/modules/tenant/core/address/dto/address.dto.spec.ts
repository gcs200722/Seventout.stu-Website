import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateAddressDto } from './create-address.dto';

describe('Address DTO validation', () => {
  it('validates and trims create address dto', async () => {
    const dto = plainToInstance(CreateAddressDto, {
      full_name: '  Nguyen Van A  ',
      phone: '0901234567',
      address_line: '  123 Le Loi  ',
      ward: '  Ben Nghe  ',
      district: '  District 1  ',
      city: '  Ho Chi Minh  ',
      country: '  Vietnam  ',
      is_default: true,
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.full_name).toBe('Nguyen Van A');
    expect(dto.address_line).toBe('123 Le Loi');
  });

  it('rejects invalid vietnam phone format', async () => {
    const dto = plainToInstance(CreateAddressDto, {
      full_name: 'Nguyen Van A',
      phone: '123456',
      address_line: '123 Le Loi',
      ward: 'Ben Nghe',
      district: 'District 1',
      city: 'Ho Chi Minh',
      country: 'Vietnam',
    });

    const errors = await validate(dto);
    const props = errors.map((item) => item.property);
    expect(props).toEqual(expect.arrayContaining(['phone']));
  });
});
