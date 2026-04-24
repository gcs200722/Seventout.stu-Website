import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProductVariantsAndInventoryByVariant1713084200000 implements MigrationInterface {
  name = 'ProductVariantsAndInventoryByVariant1713084200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS product_variants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL,
        color VARCHAR(64) NOT NULL,
        size VARCHAR(32) NOT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_product_variants_product
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_product_variants_product_color_size_norm
      ON product_variants (
        product_id,
        lower(trim(both from color)),
        lower(trim(both from size))
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_product_variants_product_id_sort
      ON product_variants (product_id, sort_order ASC, id ASC);
    `);

    await queryRunner.query(`
      INSERT INTO product_variants (id, product_id, color, size, sort_order)
      SELECT gen_random_uuid(), p.id, 'Mặc định', '-', 0
      FROM products p
      WHERE p.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM product_variants v WHERE v.product_id = p.id
        );
    `);

    await queryRunner.query(`
      INSERT INTO product_variants (id, product_id, color, size, sort_order)
      SELECT gen_random_uuid(), p.id, 'Mặc định', '-', 0
      FROM products p
      WHERE p.deleted_at IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM product_variants v WHERE v.product_id = p.id
        );
    `);

    await queryRunner.query(`
      ALTER TABLE inventories
      ADD COLUMN IF NOT EXISTS product_variant_id UUID NULL;
    `);

    await queryRunner.query(`
      UPDATE inventories i
      SET product_variant_id = v.id
      FROM (
        SELECT DISTINCT ON (product_id) id, product_id
        FROM product_variants
        ORDER BY product_id, sort_order ASC, id ASC
      ) v
      WHERE i.product_id = v.product_id AND i.product_variant_id IS NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE inventories
      ALTER COLUMN product_variant_id SET NOT NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE inventories
      ADD CONSTRAINT fk_inventories_product_variant
        FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE CASCADE;
    `);

    await queryRunner.query(`
      ALTER TABLE inventories DROP CONSTRAINT IF EXISTS uq_inventories_product_channel;
    `);

    await queryRunner.query(`
      ALTER TABLE inventories DROP CONSTRAINT IF EXISTS fk_inventories_product;
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_inventories_product_channel;
    `);

    await queryRunner.query(`
      ALTER TABLE inventories DROP COLUMN IF EXISTS product_id;
    `);

    await queryRunner.query(`
      ALTER TABLE inventories
      ADD CONSTRAINT uq_inventories_variant_channel
        UNIQUE (product_variant_id, channel);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_inventories_variant_channel
      ON inventories (product_variant_id, channel);
    `);

    await queryRunner.query(`
      ALTER TABLE inventory_movements
      ADD COLUMN IF NOT EXISTS product_variant_id UUID NULL;
    `);

    await queryRunner.query(`
      UPDATE inventory_movements m
      SET product_variant_id = v.id
      FROM (
        SELECT DISTINCT ON (product_id) id, product_id
        FROM product_variants
        ORDER BY product_id, sort_order ASC, id ASC
      ) v
      WHERE m.product_id = v.product_id AND m.product_variant_id IS NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE inventory_movements
      ALTER COLUMN product_variant_id SET NOT NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE inventory_movements
      ADD CONSTRAINT fk_inventory_movements_product_variant
        FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE CASCADE;
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_inventory_movements_product_created_at;
    `);

    await queryRunner.query(`
      ALTER TABLE inventory_movements DROP CONSTRAINT IF EXISTS fk_inventory_movements_product;
    `);

    await queryRunner.query(`
      ALTER TABLE inventory_movements DROP COLUMN IF EXISTS product_id;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_inventory_movements_variant_created_at
      ON inventory_movements (product_variant_id, created_at DESC);
    `);

    await queryRunner.query(`
      ALTER TABLE cart_items
      ADD COLUMN IF NOT EXISTS product_variant_id UUID NULL;
    `);

    await queryRunner.query(`
      UPDATE cart_items c
      SET product_variant_id = v.id
      FROM (
        SELECT DISTINCT ON (product_id) id, product_id
        FROM product_variants
        ORDER BY product_id, sort_order ASC, id ASC
      ) v
      WHERE c.product_id = v.product_id AND c.product_variant_id IS NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE cart_items
      ALTER COLUMN product_variant_id SET NOT NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE cart_items
      ADD CONSTRAINT fk_cart_items_product_variant
        FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE CASCADE;
    `);

    await queryRunner.query(`
      ALTER TABLE order_items
      ADD COLUMN IF NOT EXISTS product_variant_id UUID NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE order_items
      ADD COLUMN IF NOT EXISTS variant_color VARCHAR(64) NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE order_items
      ADD COLUMN IF NOT EXISTS variant_size VARCHAR(32) NULL;
    `);

    await queryRunner.query(`
      UPDATE order_items o
      SET
        product_variant_id = v.id,
        variant_color = v.color,
        variant_size = v.size
      FROM (
        SELECT DISTINCT ON (product_id) id, product_id, color, size
        FROM product_variants
        ORDER BY product_id, sort_order ASC, id ASC
      ) v
      WHERE o.product_id = v.product_id AND o.product_variant_id IS NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE order_items
      ALTER COLUMN product_variant_id SET NOT NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE order_items
      ADD CONSTRAINT fk_order_items_product_variant
        FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE RESTRICT;
    `);

    await queryRunner.query(`
      ALTER TABLE product_channel_mappings
      ADD COLUMN IF NOT EXISTS product_variant_id UUID NULL;
    `);

    await queryRunner.query(`
      UPDATE product_channel_mappings m
      SET product_variant_id = v.id
      FROM (
        SELECT DISTINCT ON (product_id) id, product_id
        FROM product_variants
        ORDER BY product_id, sort_order ASC, id ASC
      ) v
      WHERE m.product_id = v.product_id AND m.product_variant_id IS NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE product_channel_mappings
      ALTER COLUMN product_variant_id SET NOT NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE product_channel_mappings
      ADD CONSTRAINT fk_product_channel_mappings_product_variant
        FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE CASCADE;
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_product_channel_mappings_product_channel_active;
    `);

    await queryRunner.query(`
      ALTER TABLE product_channel_mappings DROP CONSTRAINT IF EXISTS fk_product_channel_mappings_product;
    `);

    await queryRunner.query(`
      ALTER TABLE product_channel_mappings DROP COLUMN IF EXISTS product_id;
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_product_channel_mappings_variant_channel
      ON product_channel_mappings (product_variant_id, channel);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_product_channel_mappings_variant_channel_active
      ON product_channel_mappings (product_variant_id, channel, is_active);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_product_channel_mappings_variant_channel_active;
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS uq_product_channel_mappings_variant_channel;
    `);

    await queryRunner.query(`
      ALTER TABLE product_channel_mappings
      ADD COLUMN IF NOT EXISTS product_id UUID NULL;
    `);

    await queryRunner.query(`
      UPDATE product_channel_mappings m
      SET product_id = v.product_id
      FROM product_variants v
      WHERE m.product_variant_id = v.id;
    `);

    await queryRunner.query(`
      ALTER TABLE product_channel_mappings
      ALTER COLUMN product_id SET NOT NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE product_channel_mappings
      DROP CONSTRAINT IF EXISTS fk_product_channel_mappings_product_variant;
    `);

    await queryRunner.query(`
      ALTER TABLE product_channel_mappings DROP COLUMN IF EXISTS product_variant_id;
    `);

    await queryRunner.query(`
      ALTER TABLE product_channel_mappings
      ADD CONSTRAINT fk_product_channel_mappings_product
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_product_channel_mappings_product_channel_active
      ON product_channel_mappings (product_id, channel, is_active);
    `);

    await queryRunner.query(`
      ALTER TABLE order_items DROP CONSTRAINT IF EXISTS fk_order_items_product_variant;
    `);
    await queryRunner.query(`
      ALTER TABLE order_items DROP COLUMN IF EXISTS variant_size;
    `);
    await queryRunner.query(`
      ALTER TABLE order_items DROP COLUMN IF EXISTS variant_color;
    `);
    await queryRunner.query(`
      ALTER TABLE order_items DROP COLUMN IF EXISTS product_variant_id;
    `);

    await queryRunner.query(`
      ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS fk_cart_items_product_variant;
    `);
    await queryRunner.query(`
      ALTER TABLE cart_items DROP COLUMN IF EXISTS product_variant_id;
    `);

    await queryRunner.query(`
      ALTER TABLE inventory_movements
      ADD COLUMN IF NOT EXISTS product_id UUID NULL;
    `);

    await queryRunner.query(`
      UPDATE inventory_movements m
      SET product_id = v.product_id
      FROM product_variants v
      WHERE m.product_variant_id = v.id;
    `);

    await queryRunner.query(`
      ALTER TABLE inventory_movements
      ALTER COLUMN product_id SET NOT NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE inventory_movements
      DROP CONSTRAINT IF EXISTS fk_inventory_movements_product_variant;
    `);

    await queryRunner.query(`
      ALTER TABLE inventory_movements DROP COLUMN IF EXISTS product_variant_id;
    `);

    await queryRunner.query(`
      ALTER TABLE inventory_movements
      ADD CONSTRAINT fk_inventory_movements_product
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_inventory_movements_variant_created_at;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_created_at
      ON inventory_movements (product_id, created_at DESC);
    `);

    await queryRunner.query(`
      ALTER TABLE inventories DROP CONSTRAINT IF EXISTS uq_inventories_variant_channel;
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_inventories_variant_channel;
    `);

    await queryRunner.query(`
      ALTER TABLE inventories
      ADD COLUMN IF NOT EXISTS product_id UUID NULL;
    `);

    await queryRunner.query(`
      UPDATE inventories i
      SET product_id = v.product_id
      FROM product_variants v
      WHERE i.product_variant_id = v.id;
    `);

    await queryRunner.query(`
      ALTER TABLE inventories ALTER COLUMN product_id SET NOT NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE inventories DROP CONSTRAINT IF EXISTS fk_inventories_product_variant;
    `);

    await queryRunner.query(`
      ALTER TABLE inventories DROP COLUMN IF EXISTS product_variant_id;
    `);

    await queryRunner.query(`
      ALTER TABLE inventories
      ADD CONSTRAINT fk_inventories_product
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
    `);

    await queryRunner.query(`
      ALTER TABLE inventories
      ADD CONSTRAINT uq_inventories_product_channel UNIQUE (product_id, channel);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_inventories_product_channel
      ON inventories (product_id, channel);
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS uq_product_variants_product_color_size_norm;
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_product_variants_product_id_sort;
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS product_variants;`);
  }
}
