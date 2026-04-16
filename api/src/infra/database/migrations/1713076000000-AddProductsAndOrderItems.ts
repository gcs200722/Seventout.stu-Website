import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductsAndOrderItems1713076000000 implements MigrationInterface {
  name = 'AddProductsAndOrderItems1713076000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(200) NOT NULL,
        slug VARCHAR(160) NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        price INTEGER NOT NULL,
        category_id UUID NOT NULL,
        thumbnail VARCHAR(500) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ NULL,
        CONSTRAINT fk_products_category
          FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
        CONSTRAINT chk_products_price_nonnegative
          CHECK (price >= 0)
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_products_slug
      ON products (slug)
      WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_products_category_id
      ON products (category_id)
      WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_products_price
      ON products (price)
      WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_products_is_active
      ON products (is_active)
      WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS product_images (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL,
        image_url VARCHAR(500) NOT NULL,
        is_thumbnail BOOLEAN NOT NULL DEFAULT FALSE,
        sort_order INT NOT NULL DEFAULT 0,
        CONSTRAINT fk_product_images_product
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_product_images_product_id
      ON product_images (product_id);
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL,
        product_id UUID NOT NULL,
        quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_order_items_order
          FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        CONSTRAINT fk_order_items_product
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_order_items_product_id
      ON order_items (product_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_order_items_product_id;');
    await queryRunner.query('DROP TABLE IF EXISTS order_items;');
    await queryRunner.query(
      'DROP INDEX IF EXISTS idx_product_images_product_id;',
    );
    await queryRunner.query('DROP TABLE IF EXISTS product_images;');
    await queryRunner.query('DROP INDEX IF EXISTS idx_products_is_active;');
    await queryRunner.query('DROP INDEX IF EXISTS idx_products_price;');
    await queryRunner.query('DROP INDEX IF EXISTS idx_products_category_id;');
    await queryRunner.query('DROP INDEX IF EXISTS uq_products_slug;');
    await queryRunner.query('DROP TABLE IF EXISTS products;');
    await queryRunner.query('DROP TABLE IF EXISTS orders;');
  }
}
