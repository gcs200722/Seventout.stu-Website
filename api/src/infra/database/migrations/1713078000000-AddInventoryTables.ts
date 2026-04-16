import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInventoryTables1713078000000 implements MigrationInterface {
  name = 'AddInventoryTables1713078000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS inventories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL,
        channel VARCHAR(20) NOT NULL,
        available_stock INT NOT NULL DEFAULT 0,
        reserved_stock INT NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_inventories_product
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        CONSTRAINT chk_inventories_available_nonnegative
          CHECK (available_stock >= 0),
        CONSTRAINT chk_inventories_reserved_nonnegative
          CHECK (reserved_stock >= 0),
        CONSTRAINT uq_inventories_product_channel
          UNIQUE (product_id, channel)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_inventories_product_channel
      ON inventories (product_id, channel);
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS inventory_movements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL,
        channel VARCHAR(20) NOT NULL,
        type VARCHAR(20) NOT NULL,
        quantity INT NOT NULL,
        before_stock INT NOT NULL,
        after_stock INT NOT NULL,
        reason VARCHAR(255) NOT NULL,
        metadata JSONB NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_inventory_movements_product
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        CONSTRAINT chk_inventory_movements_quantity_positive
          CHECK (quantity > 0)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_created_at
      ON inventory_movements (product_id, created_at DESC);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_inventory_movements_channel_created_at
      ON inventory_movements (channel, created_at DESC);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_inventory_movements_type
      ON inventory_movements (type);
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS product_channel_mappings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL,
        channel VARCHAR(20) NOT NULL,
        external_product_id VARCHAR(100) NOT NULL,
        external_sku_id VARCHAR(100) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_product_channel_mappings_product
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        CONSTRAINT uq_product_channel_mapping_external
          UNIQUE (channel, external_product_id, external_sku_id)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_product_channel_mappings_product_channel_active
      ON product_channel_mappings (product_id, channel, is_active);
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS inventory_webhook_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        channel VARCHAR(20) NOT NULL,
        external_event_id VARCHAR(120) NOT NULL,
        payload JSONB NOT NULL,
        processed_at TIMESTAMPTZ NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_inventory_webhook_events_channel_event
          UNIQUE (channel, external_event_id)
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX IF EXISTS idx_product_channel_mappings_product_channel_active;',
    );
    await queryRunner.query('DROP TABLE IF EXISTS inventory_webhook_events;');
    await queryRunner.query('DROP TABLE IF EXISTS product_channel_mappings;');
    await queryRunner.query(
      'DROP INDEX IF EXISTS idx_inventory_movements_type;',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS idx_inventory_movements_channel_created_at;',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS idx_inventory_movements_product_created_at;',
    );
    await queryRunner.query('DROP TABLE IF EXISTS inventory_movements;');
    await queryRunner.query(
      'DROP INDEX IF EXISTS idx_inventories_product_channel;',
    );
    await queryRunner.query('DROP TABLE IF EXISTS inventories;');
  }
}
