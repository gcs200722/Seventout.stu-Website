import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTenantScopeToCatalogAndInventory1713084300000 implements MigrationInterface {
  name = 'AddTenantScopeToCatalogAndInventory1713084300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE categories
      ADD COLUMN IF NOT EXISTS tenant_id UUID;
    `);
    await queryRunner.query(`
      UPDATE categories
      SET tenant_id = (
        SELECT id FROM tenants WHERE LOWER(slug) = 'default' LIMIT 1
      )
      WHERE tenant_id IS NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE categories
      ALTER COLUMN tenant_id SET NOT NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE categories
      DROP CONSTRAINT IF EXISTS fk_categories_tenant;
    `);
    await queryRunner.query(`
      ALTER TABLE categories
      ADD CONSTRAINT fk_categories_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;
    `);
    await queryRunner.query(`DROP INDEX IF EXISTS uq_categories_slug;`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_tenant_slug
      ON categories (tenant_id, slug)
      WHERE deleted_at IS NULL;
    `);
    await queryRunner.query(`DROP INDEX IF EXISTS uq_categories_parent_name;`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_tenant_parent_name
      ON categories (tenant_id, parent_id, LOWER(name))
      WHERE deleted_at IS NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_categories_tenant_created_at
      ON categories (tenant_id, created_at DESC);
    `);

    await queryRunner.query(`
      ALTER TABLE products
      ADD COLUMN IF NOT EXISTS tenant_id UUID;
    `);
    await queryRunner.query(`
      UPDATE products
      SET tenant_id = c.tenant_id
      FROM categories c
      WHERE products.category_id = c.id
        AND products.tenant_id IS NULL;
    `);
    await queryRunner.query(`
      UPDATE products
      SET tenant_id = (
        SELECT id FROM tenants WHERE LOWER(slug) = 'default' LIMIT 1
      )
      WHERE tenant_id IS NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE products
      ALTER COLUMN tenant_id SET NOT NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE products
      DROP CONSTRAINT IF EXISTS fk_products_tenant;
    `);
    await queryRunner.query(`
      ALTER TABLE products
      ADD CONSTRAINT fk_products_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;
    `);
    await queryRunner.query(`DROP INDEX IF EXISTS uq_products_slug;`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_products_tenant_slug
      ON products (tenant_id, slug)
      WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE product_images
      ADD COLUMN IF NOT EXISTS tenant_id UUID;
    `);
    await queryRunner.query(`
      UPDATE product_images pi
      SET tenant_id = p.tenant_id
      FROM products p
      WHERE pi.product_id = p.id
        AND pi.tenant_id IS NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE product_images
      ALTER COLUMN tenant_id SET NOT NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE product_images
      DROP CONSTRAINT IF EXISTS fk_product_images_tenant;
    `);
    await queryRunner.query(`
      ALTER TABLE product_images
      ADD CONSTRAINT fk_product_images_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_product_images_tenant_product
      ON product_images (tenant_id, product_id);
    `);

    await queryRunner.query(`
      ALTER TABLE product_variants
      ADD COLUMN IF NOT EXISTS tenant_id UUID;
    `);
    await queryRunner.query(`
      UPDATE product_variants pv
      SET tenant_id = p.tenant_id
      FROM products p
      WHERE pv.product_id = p.id
        AND pv.tenant_id IS NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE product_variants
      ALTER COLUMN tenant_id SET NOT NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE product_variants
      DROP CONSTRAINT IF EXISTS fk_product_variants_tenant;
    `);
    await queryRunner.query(`
      ALTER TABLE product_variants
      ADD CONSTRAINT fk_product_variants_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_product_variants_tenant_product_sort
      ON product_variants (tenant_id, product_id, sort_order ASC, id ASC);
    `);

    await queryRunner.query(`
      ALTER TABLE inventories
      ADD COLUMN IF NOT EXISTS tenant_id UUID;
    `);
    await queryRunner.query(`
      UPDATE inventories i
      SET tenant_id = pv.tenant_id
      FROM product_variants pv
      WHERE i.product_variant_id = pv.id
        AND i.tenant_id IS NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE inventories
      ALTER COLUMN tenant_id SET NOT NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE inventories
      DROP CONSTRAINT IF EXISTS fk_inventories_tenant;
    `);
    await queryRunner.query(`
      ALTER TABLE inventories
      ADD CONSTRAINT fk_inventories_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_inventories_tenant_variant_channel
      ON inventories (tenant_id, product_variant_id, channel);
    `);

    await queryRunner.query(`
      ALTER TABLE inventory_movements
      ADD COLUMN IF NOT EXISTS tenant_id UUID;
    `);
    await queryRunner.query(`
      UPDATE inventory_movements m
      SET tenant_id = pv.tenant_id
      FROM product_variants pv
      WHERE m.product_variant_id = pv.id
        AND m.tenant_id IS NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE inventory_movements
      ALTER COLUMN tenant_id SET NOT NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE inventory_movements
      DROP CONSTRAINT IF EXISTS fk_inventory_movements_tenant;
    `);
    await queryRunner.query(`
      ALTER TABLE inventory_movements
      ADD CONSTRAINT fk_inventory_movements_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_inventory_movements_tenant_variant_created
      ON inventory_movements (tenant_id, product_variant_id, created_at DESC);
    `);

    await queryRunner.query(`
      ALTER TABLE product_channel_mappings
      ADD COLUMN IF NOT EXISTS tenant_id UUID;
    `);
    await queryRunner.query(`
      UPDATE product_channel_mappings m
      SET tenant_id = pv.tenant_id
      FROM product_variants pv
      WHERE m.product_variant_id = pv.id
        AND m.tenant_id IS NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE product_channel_mappings
      ALTER COLUMN tenant_id SET NOT NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE product_channel_mappings
      DROP CONSTRAINT IF EXISTS fk_product_channel_mappings_tenant;
    `);
    await queryRunner.query(`
      ALTER TABLE product_channel_mappings
      ADD CONSTRAINT fk_product_channel_mappings_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_product_channel_mappings_tenant_variant_channel_active
      ON product_channel_mappings (tenant_id, product_variant_id, channel, is_active);
    `);

    await queryRunner.query(`
      ALTER TABLE inventory_webhook_events
      ADD COLUMN IF NOT EXISTS tenant_id UUID;
    `);
    await queryRunner.query(`
      UPDATE inventory_webhook_events
      SET tenant_id = (
        SELECT id FROM tenants WHERE LOWER(slug) = 'default' LIMIT 1
      )
      WHERE tenant_id IS NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE inventory_webhook_events
      ALTER COLUMN tenant_id SET NOT NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE inventory_webhook_events
      DROP CONSTRAINT IF EXISTS fk_inventory_webhook_events_tenant;
    `);
    await queryRunner.query(`
      ALTER TABLE inventory_webhook_events
      ADD CONSTRAINT fk_inventory_webhook_events_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;
    `);
    await queryRunner.query(
      `DROP TABLE IF EXISTS _tmp_inventory_webhook_events;`,
    );
    await queryRunner.query(`
      ALTER TABLE inventory_webhook_events
      DROP CONSTRAINT IF EXISTS uq_inventory_webhook_events_channel_event;
    `);
    await queryRunner.query(`
      ALTER TABLE inventory_webhook_events
      DROP CONSTRAINT IF EXISTS uq_inventory_webhook_events_tenant_channel_event;
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS uq_inventory_webhook_events_tenant_channel_event;
    `);
    await queryRunner.query(`
      ALTER TABLE inventory_webhook_events
      ADD CONSTRAINT uq_inventory_webhook_events_tenant_channel_event
        UNIQUE (tenant_id, channel, external_event_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE inventory_webhook_events
      DROP CONSTRAINT IF EXISTS uq_inventory_webhook_events_tenant_channel_event;
    `);
    await queryRunner.query(`
      ALTER TABLE inventory_webhook_events
      ADD CONSTRAINT uq_inventory_webhook_events_channel_event
        UNIQUE (channel, external_event_id);
    `);
    await queryRunner.query(`
      ALTER TABLE inventory_webhook_events
      DROP CONSTRAINT IF EXISTS fk_inventory_webhook_events_tenant;
    `);
    await queryRunner.query(`
      ALTER TABLE inventory_webhook_events
      DROP COLUMN IF EXISTS tenant_id;
    `);

    await queryRunner.query(
      'DROP INDEX IF EXISTS idx_product_channel_mappings_tenant_variant_channel_active;',
    );
    await queryRunner.query(`
      ALTER TABLE product_channel_mappings
      DROP CONSTRAINT IF EXISTS fk_product_channel_mappings_tenant;
    `);
    await queryRunner.query(`
      ALTER TABLE product_channel_mappings
      DROP COLUMN IF EXISTS tenant_id;
    `);

    await queryRunner.query(
      'DROP INDEX IF EXISTS idx_inventory_movements_tenant_variant_created;',
    );
    await queryRunner.query(`
      ALTER TABLE inventory_movements
      DROP CONSTRAINT IF EXISTS fk_inventory_movements_tenant;
    `);
    await queryRunner.query(`
      ALTER TABLE inventory_movements
      DROP COLUMN IF EXISTS tenant_id;
    `);

    await queryRunner.query(
      'DROP INDEX IF EXISTS idx_inventories_tenant_variant_channel;',
    );
    await queryRunner.query(`
      ALTER TABLE inventories
      DROP CONSTRAINT IF EXISTS fk_inventories_tenant;
    `);
    await queryRunner.query(`
      ALTER TABLE inventories
      DROP COLUMN IF EXISTS tenant_id;
    `);

    await queryRunner.query(
      'DROP INDEX IF EXISTS idx_product_variants_tenant_product_sort;',
    );
    await queryRunner.query(`
      ALTER TABLE product_variants
      DROP CONSTRAINT IF EXISTS fk_product_variants_tenant;
    `);
    await queryRunner.query(`
      ALTER TABLE product_variants
      DROP COLUMN IF EXISTS tenant_id;
    `);

    await queryRunner.query(
      'DROP INDEX IF EXISTS idx_product_images_tenant_product;',
    );
    await queryRunner.query(`
      ALTER TABLE product_images
      DROP CONSTRAINT IF EXISTS fk_product_images_tenant;
    `);
    await queryRunner.query(`
      ALTER TABLE product_images
      DROP COLUMN IF EXISTS tenant_id;
    `);

    await queryRunner.query(`DROP INDEX IF EXISTS uq_products_tenant_slug;`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_products_slug
      ON products (slug)
      WHERE deleted_at IS NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE products
      DROP CONSTRAINT IF EXISTS fk_products_tenant;
    `);
    await queryRunner.query(`
      ALTER TABLE products
      DROP COLUMN IF EXISTS tenant_id;
    `);

    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_categories_tenant_created_at;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS uq_categories_tenant_parent_name;`,
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_parent_name
      ON categories (parent_id, LOWER(name))
      WHERE deleted_at IS NULL;
    `);
    await queryRunner.query(`DROP INDEX IF EXISTS uq_categories_tenant_slug;`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_slug
      ON categories (slug)
      WHERE deleted_at IS NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE categories
      DROP CONSTRAINT IF EXISTS fk_categories_tenant;
    `);
    await queryRunner.query(`
      ALTER TABLE categories
      DROP COLUMN IF EXISTS tenant_id;
    `);
  }
}
