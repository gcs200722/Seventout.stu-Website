import { MigrationInterface, QueryRunner } from 'typeorm';

export class GuestCartAndCheckout1713084300000 implements MigrationInterface {
  name = 'GuestCartAndCheckout1713084300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS uq_carts_user_active;');
    await queryRunner.query(
      'ALTER TABLE carts DROP CONSTRAINT IF EXISTS fk_carts_user;',
    );
    await queryRunner.query(`
      ALTER TABLE carts
      ALTER COLUMN user_id DROP NOT NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE carts
      ADD COLUMN IF NOT EXISTS guest_session_id UUID NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE carts
      ADD CONSTRAINT fk_carts_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_carts_user_active
      ON carts (user_id)
      WHERE status = 'ACTIVE' AND user_id IS NOT NULL;
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_carts_guest_session_active
      ON carts (guest_session_id)
      WHERE status = 'ACTIVE'
        AND user_id IS NULL
        AND guest_session_id IS NOT NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE carts
      ADD CONSTRAINT chk_carts_owner_user_or_guest
      CHECK (
        (user_id IS NOT NULL AND guest_session_id IS NULL)
        OR (user_id IS NULL AND guest_session_id IS NOT NULL)
      ) NOT VALID;
    `);
    await queryRunner.query(`
      ALTER TABLE carts
      VALIDATE CONSTRAINT chk_carts_owner_user_or_guest;
    `);

    await queryRunner.query(
      'DROP INDEX IF EXISTS uq_orders_user_idempotency_key;',
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_orders_user_idempotency_key
      ON orders (user_id, idempotency_key)
      WHERE deleted_at IS NULL
        AND idempotency_key IS NOT NULL
        AND user_id IS NOT NULL;
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_orders_guest_idempotency_key
      ON orders (idempotency_key)
      WHERE deleted_at IS NULL
        AND idempotency_key IS NOT NULL
        AND user_id IS NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE orders
      ALTER COLUMN user_id DROP NOT NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS customer_email VARCHAR(320) NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS order_number VARCHAR(40) NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS guest_lookup_secret_hash VARCHAR(128) NULL;
    `);

    await queryRunner.query(`
      UPDATE orders
      SET order_number = 'ORD-LEG-' || replace(id::text, '-', '')
      WHERE order_number IS NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE orders
      ALTER COLUMN order_number SET NOT NULL;
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_order_number
      ON orders (order_number)
      WHERE deleted_at IS NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_customer_email
      ON orders (customer_email)
      WHERE deleted_at IS NULL AND customer_email IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_orders_customer_email;');
    await queryRunner.query('DROP INDEX IF EXISTS uq_orders_order_number;');
    await queryRunner.query(`
      ALTER TABLE orders
      DROP COLUMN IF EXISTS guest_lookup_secret_hash;
    `);
    await queryRunner.query(`
      ALTER TABLE orders
      DROP COLUMN IF EXISTS order_number;
    `);
    await queryRunner.query(`
      ALTER TABLE orders
      DROP COLUMN IF EXISTS customer_email;
    `);
    await queryRunner.query(`
      ALTER TABLE orders
      ALTER COLUMN user_id SET NOT NULL;
    `);
    await queryRunner.query(
      'DROP INDEX IF EXISTS uq_orders_guest_idempotency_key;',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS uq_orders_user_idempotency_key;',
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_orders_user_idempotency_key
      ON orders (user_id, idempotency_key)
      WHERE deleted_at IS NULL AND idempotency_key IS NOT NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE carts
      DROP CONSTRAINT IF EXISTS chk_carts_owner_user_or_guest;
    `);
    await queryRunner.query(
      'DROP INDEX IF EXISTS uq_carts_guest_session_active;',
    );
    await queryRunner.query('DROP INDEX IF EXISTS uq_carts_user_active;');
    await queryRunner.query(`
      ALTER TABLE carts
      DROP COLUMN IF EXISTS guest_session_id;
    `);
    await queryRunner.query(`
      DELETE FROM carts WHERE user_id IS NULL;
    `);
    await queryRunner.query(
      'ALTER TABLE carts DROP CONSTRAINT IF EXISTS fk_carts_user;',
    );
    await queryRunner.query(`
      ALTER TABLE carts
      ALTER COLUMN user_id SET NOT NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE carts
      ADD CONSTRAINT fk_carts_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_carts_user_active
      ON carts (user_id)
      WHERE status = 'ACTIVE';
    `);
  }
}
