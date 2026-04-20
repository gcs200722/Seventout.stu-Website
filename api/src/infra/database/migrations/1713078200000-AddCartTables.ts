import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCartTables1713078200000 implements MigrationInterface {
  name = 'AddCartTables1713078200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS carts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_carts_user
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_carts_user_status
      ON carts (user_id, status);
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_carts_user_active
      ON carts (user_id)
      WHERE status = 'ACTIVE';
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cart_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        cart_id UUID NOT NULL,
        product_id UUID NOT NULL,
        quantity INT NOT NULL CHECK (quantity > 0),
        price INT NOT NULL CHECK (price >= 0),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_cart_items_cart
          FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
        CONSTRAINT fk_cart_items_product
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id
      ON cart_items (cart_id);
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_cart_items_cart_product
      ON cart_items (cart_id, product_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS uq_cart_items_cart_product;');
    await queryRunner.query('DROP INDEX IF EXISTS idx_cart_items_cart_id;');
    await queryRunner.query('DROP TABLE IF EXISTS cart_items;');
    await queryRunner.query('DROP INDEX IF EXISTS uq_carts_user_active;');
    await queryRunner.query('DROP INDEX IF EXISTS idx_carts_user_status;');
    await queryRunner.query('DROP TABLE IF EXISTS carts;');
  }
}
