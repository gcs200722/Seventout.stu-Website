import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrdersModuleTables1713078400000 implements MigrationInterface {
  name = 'AddOrdersModuleTables1713078400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS user_id UUID,
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
      ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) NOT NULL DEFAULT 'UNPAID',
      ADD COLUMN IF NOT EXISTS fulfillment_status VARCHAR(20) NOT NULL DEFAULT 'UNFULFILLED',
      ADD COLUMN IF NOT EXISTS total_amount INT NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS shipping_address TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS note TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ NULL,
      ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ NULL,
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE orders
      ADD CONSTRAINT chk_orders_total_amount_nonnegative
      CHECK (total_amount >= 0) NOT VALID;
    `);
    await queryRunner.query(`
      ALTER TABLE orders
      VALIDATE CONSTRAINT chk_orders_total_amount_nonnegative;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_user_id_created_at
      ON orders (user_id, created_at DESC)
      WHERE deleted_at IS NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_status_created_at
      ON orders (status, created_at DESC)
      WHERE deleted_at IS NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_payment_status_created_at
      ON orders (payment_status, created_at DESC)
      WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE order_items
      ADD COLUMN IF NOT EXISTS product_name VARCHAR(200),
      ADD COLUMN IF NOT EXISTS price INT,
      ADD COLUMN IF NOT EXISTS subtotal INT;
    `);
    await queryRunner.query(`
      UPDATE order_items
      SET
        product_name = COALESCE(product_name, 'Unknown product'),
        price = COALESCE(price, 0),
        subtotal = COALESCE(subtotal, quantity * COALESCE(price, 0))
      WHERE product_name IS NULL OR price IS NULL OR subtotal IS NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE order_items
      ALTER COLUMN product_name SET NOT NULL,
      ALTER COLUMN price SET NOT NULL,
      ALTER COLUMN subtotal SET NOT NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE order_items
      ADD CONSTRAINT chk_order_items_price_nonnegative
      CHECK (price >= 0) NOT VALID;
    `);
    await queryRunner.query(`
      ALTER TABLE order_items
      ADD CONSTRAINT chk_order_items_subtotal_nonnegative
      CHECK (subtotal >= 0) NOT VALID;
    `);
    await queryRunner.query(`
      ALTER TABLE order_items
      VALIDATE CONSTRAINT chk_order_items_price_nonnegative;
    `);
    await queryRunner.query(`
      ALTER TABLE order_items
      VALIDATE CONSTRAINT chk_order_items_subtotal_nonnegative;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_order_items_order_id_created_at
      ON order_items (order_id, created_at ASC);
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS order_event_outbox (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL,
        event_type VARCHAR(64) NOT NULL,
        payload JSONB NOT NULL,
        processed_at TIMESTAMPTZ NULL,
        failed_at TIMESTAMPTZ NULL,
        error_message TEXT NULL,
        retry_count INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_order_event_outbox_order
          FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_order_event_outbox_created_at
      ON order_event_outbox (created_at DESC);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_order_event_outbox_pending
      ON order_event_outbox (processed_at, failed_at, created_at DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX IF EXISTS idx_order_event_outbox_pending;',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS idx_order_event_outbox_created_at;',
    );
    await queryRunner.query('DROP TABLE IF EXISTS order_event_outbox;');
    await queryRunner.query(
      'DROP INDEX IF EXISTS idx_order_items_order_id_created_at;',
    );
    await queryRunner.query(
      'ALTER TABLE order_items DROP CONSTRAINT IF EXISTS chk_order_items_subtotal_nonnegative;',
    );
    await queryRunner.query(
      'ALTER TABLE order_items DROP CONSTRAINT IF EXISTS chk_order_items_price_nonnegative;',
    );
    await queryRunner.query(`
      ALTER TABLE order_items
      DROP COLUMN IF EXISTS subtotal,
      DROP COLUMN IF EXISTS price,
      DROP COLUMN IF EXISTS product_name;
    `);
    await queryRunner.query(
      'DROP INDEX IF EXISTS idx_orders_payment_status_created_at;',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS idx_orders_status_created_at;',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS idx_orders_user_id_created_at;',
    );
    await queryRunner.query(
      'ALTER TABLE orders DROP CONSTRAINT IF EXISTS chk_orders_total_amount_nonnegative;',
    );
    await queryRunner.query(`
      ALTER TABLE orders
      DROP COLUMN IF EXISTS deleted_at,
      DROP COLUMN IF EXISTS completed_at,
      DROP COLUMN IF EXISTS canceled_at,
      DROP COLUMN IF EXISTS note,
      DROP COLUMN IF EXISTS shipping_address,
      DROP COLUMN IF EXISTS total_amount,
      DROP COLUMN IF EXISTS fulfillment_status,
      DROP COLUMN IF EXISTS payment_status,
      DROP COLUMN IF EXISTS status,
      DROP COLUMN IF EXISTS user_id;
    `);
  }
}
