import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeOrderShippingAddressToSnapshot1713078600000 implements MigrationInterface {
  name = 'ChangeOrderShippingAddressToSnapshot1713078600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE orders
      ALTER COLUMN shipping_address DROP DEFAULT;
    `);
    await queryRunner.query(`
      ALTER TABLE orders
      ALTER COLUMN shipping_address TYPE jsonb
      USING jsonb_build_object(
        'full_name', 'Unknown customer',
        'phone', '',
        'address_line', COALESCE(shipping_address, ''),
        'ward', '',
        'city', '',
        'country', 'Vietnam'
      );
    `);
    await queryRunner.query(`
      ALTER TABLE orders
      ALTER COLUMN shipping_address SET DEFAULT '{"full_name":"","phone":"","address_line":"","ward":"","city":"","country":"Vietnam"}'::jsonb;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE orders
      ALTER COLUMN shipping_address DROP DEFAULT;
    `);
    await queryRunner.query(`
      ALTER TABLE orders
      ALTER COLUMN shipping_address TYPE text
      USING COALESCE(shipping_address->>'address_line', '');
    `);
    await queryRunner.query(`
      ALTER TABLE orders
      ALTER COLUMN shipping_address SET DEFAULT '';
    `);
  }
}
