import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAddressesAndOrderAddressLink1713078800000 implements MigrationInterface {
  name = 'AddAddressesAndOrderAddressLink1713078800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS addresses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        full_name VARCHAR(200) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        address_line VARCHAR(255) NOT NULL,
        ward VARCHAR(120) NOT NULL,
        district VARCHAR(120) NOT NULL,
        city VARCHAR(120) NOT NULL,
        country VARCHAR(120) NOT NULL,
        is_default BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ NULL,
        CONSTRAINT fk_addresses_user
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_addresses_user_id
      ON addresses (user_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_addresses_is_default
      ON addresses (is_default);
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_addresses_unique_default_per_user
      ON addresses (user_id)
      WHERE is_default = true AND deleted_at IS NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS address_id UUID NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_address_id
      ON orders (address_id)
      WHERE deleted_at IS NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE orders
      ADD CONSTRAINT fk_orders_address
      FOREIGN KEY (address_id) REFERENCES addresses(id) ON DELETE RESTRICT;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE orders
      DROP CONSTRAINT IF EXISTS fk_orders_address;
    `);
    await queryRunner.query('DROP INDEX IF EXISTS idx_orders_address_id;');
    await queryRunner.query(`
      ALTER TABLE orders
      DROP COLUMN IF EXISTS address_id;
    `);

    await queryRunner.query(
      'DROP INDEX IF EXISTS idx_addresses_unique_default_per_user;',
    );
    await queryRunner.query('DROP INDEX IF EXISTS idx_addresses_is_default;');
    await queryRunner.query('DROP INDEX IF EXISTS idx_addresses_user_id;');
    await queryRunner.query('DROP TABLE IF EXISTS addresses;');
  }
}
