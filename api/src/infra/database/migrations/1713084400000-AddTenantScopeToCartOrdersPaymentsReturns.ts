import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTenantScopeToCartOrdersPaymentsReturns1713084400000 implements MigrationInterface {
  name = 'AddTenantScopeToCartOrdersPaymentsReturns1713084400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE carts
      ADD COLUMN IF NOT EXISTS tenant_id UUID;
    `);
    await queryRunner.query(`
      UPDATE carts
      SET tenant_id = (
        SELECT id FROM tenants WHERE LOWER(slug) = 'default' LIMIT 1
      )
      WHERE tenant_id IS NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE carts
      ALTER COLUMN tenant_id SET NOT NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE carts
      DROP CONSTRAINT IF EXISTS fk_carts_tenant;
    `);
    await queryRunner.query(`
      ALTER TABLE carts
      ADD CONSTRAINT fk_carts_tenant
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;
    `);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_carts_user_status;`);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_carts_tenant_user_status
      ON carts (tenant_id, user_id, status);
    `);
    await queryRunner.query(`DROP INDEX IF EXISTS uq_carts_user_active;`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_carts_tenant_user_active
      ON carts (tenant_id, user_id)
      WHERE status = 'ACTIVE';
    `);

    await queryRunner.query(`
      ALTER TABLE cart_items
      ADD COLUMN IF NOT EXISTS tenant_id UUID;
    `);
    await queryRunner.query(`
      UPDATE cart_items ci
      SET tenant_id = c.tenant_id
      FROM carts c
      WHERE ci.cart_id = c.id
        AND ci.tenant_id IS NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE cart_items
      ALTER COLUMN tenant_id SET NOT NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE cart_items
      DROP CONSTRAINT IF EXISTS fk_cart_items_tenant;
    `);
    await queryRunner.query(`
      ALTER TABLE cart_items
      ADD CONSTRAINT fk_cart_items_tenant
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_cart_items_tenant_cart_id
      ON cart_items (tenant_id, cart_id);
    `);

    await queryRunner.query(`
      ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS tenant_id UUID;
    `);
    await queryRunner.query(`
      UPDATE orders
      SET tenant_id = (
        SELECT id FROM tenants WHERE LOWER(slug) = 'default' LIMIT 1
      )
      WHERE tenant_id IS NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE orders
      ALTER COLUMN tenant_id SET NOT NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE orders
      DROP CONSTRAINT IF EXISTS fk_orders_tenant;
    `);
    await queryRunner.query(`
      ALTER TABLE orders
      ADD CONSTRAINT fk_orders_tenant
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_tenant_created_at
      ON orders (tenant_id, created_at DESC)
      WHERE deleted_at IS NULL;
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_tenant_idempotency_key
      ON orders (tenant_id, idempotency_key)
      WHERE idempotency_key IS NOT NULL AND deleted_at IS NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE order_items
      ADD COLUMN IF NOT EXISTS tenant_id UUID;
    `);
    await queryRunner.query(`
      UPDATE order_items oi
      SET tenant_id = o.tenant_id
      FROM orders o
      WHERE oi.order_id = o.id
        AND oi.tenant_id IS NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE order_items
      ALTER COLUMN tenant_id SET NOT NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE order_items
      DROP CONSTRAINT IF EXISTS fk_order_items_tenant;
    `);
    await queryRunner.query(`
      ALTER TABLE order_items
      ADD CONSTRAINT fk_order_items_tenant
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_order_items_tenant_order_id_created_at
      ON order_items (tenant_id, order_id, created_at ASC);
    `);

    await queryRunner.query(`
      ALTER TABLE order_event_outbox
      ADD COLUMN IF NOT EXISTS tenant_id UUID;
    `);
    await queryRunner.query(`
      UPDATE order_event_outbox outbox
      SET tenant_id = o.tenant_id
      FROM orders o
      WHERE outbox.order_id = o.id
        AND outbox.tenant_id IS NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE order_event_outbox
      ALTER COLUMN tenant_id SET NOT NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE order_event_outbox
      DROP CONSTRAINT IF EXISTS fk_order_event_outbox_tenant;
    `);
    await queryRunner.query(`
      ALTER TABLE order_event_outbox
      ADD CONSTRAINT fk_order_event_outbox_tenant
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_order_event_outbox_tenant_pending
      ON order_event_outbox (tenant_id, processed_at, failed_at, created_at DESC);
    `);

    await queryRunner.query(`
      ALTER TABLE payments
      ADD COLUMN IF NOT EXISTS tenant_id UUID;
    `);
    await queryRunner.query(`
      UPDATE payments p
      SET tenant_id = o.tenant_id
      FROM orders o
      WHERE p.order_id = o.id
        AND p.tenant_id IS NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE payments
      ALTER COLUMN tenant_id SET NOT NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE payments
      DROP CONSTRAINT IF EXISTS fk_payments_tenant;
    `);
    await queryRunner.query(`
      ALTER TABLE payments
      ADD CONSTRAINT fk_payments_tenant
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;
    `);
    await queryRunner.query(
      `DROP INDEX IF EXISTS uq_payments_idempotency_key;`,
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_tenant_idempotency_key
      ON payments (tenant_id, idempotency_key)
      WHERE idempotency_key IS NOT NULL AND deleted_at IS NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE fulfillments
      ADD COLUMN IF NOT EXISTS tenant_id UUID;
    `);
    await queryRunner.query(`
      UPDATE fulfillments f
      SET tenant_id = o.tenant_id
      FROM orders o
      WHERE f.order_id = o.id
        AND f.tenant_id IS NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE fulfillments
      ALTER COLUMN tenant_id SET NOT NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE fulfillments
      DROP CONSTRAINT IF EXISTS fk_fulfillments_tenant;
    `);
    await queryRunner.query(`
      ALTER TABLE fulfillments
      ADD CONSTRAINT fk_fulfillments_tenant
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;
    `);

    await queryRunner.query(`
      ALTER TABLE returns
      ADD COLUMN IF NOT EXISTS tenant_id UUID;
    `);
    await queryRunner.query(`
      UPDATE returns r
      SET tenant_id = o.tenant_id
      FROM orders o
      WHERE r.order_id = o.id
        AND r.tenant_id IS NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE returns
      ALTER COLUMN tenant_id SET NOT NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE returns
      DROP CONSTRAINT IF EXISTS fk_returns_tenant;
    `);
    await queryRunner.query(`
      ALTER TABLE returns
      ADD CONSTRAINT fk_returns_tenant
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;
    `);

    await queryRunner.query(`
      ALTER TABLE refunds
      ADD COLUMN IF NOT EXISTS tenant_id UUID;
    `);
    await queryRunner.query(`
      UPDATE refunds rf
      SET tenant_id = o.tenant_id
      FROM orders o
      WHERE rf.order_id = o.id
        AND rf.tenant_id IS NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE refunds
      ALTER COLUMN tenant_id SET NOT NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE refunds
      DROP CONSTRAINT IF EXISTS fk_refunds_tenant;
    `);
    await queryRunner.query(`
      ALTER TABLE refunds
      ADD CONSTRAINT fk_refunds_tenant
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE refunds DROP CONSTRAINT IF EXISTS fk_refunds_tenant;',
    );
    await queryRunner.query(
      'ALTER TABLE refunds DROP COLUMN IF EXISTS tenant_id;',
    );

    await queryRunner.query(
      'ALTER TABLE returns DROP CONSTRAINT IF EXISTS fk_returns_tenant;',
    );
    await queryRunner.query(
      'ALTER TABLE returns DROP COLUMN IF EXISTS tenant_id;',
    );

    await queryRunner.query(
      'ALTER TABLE fulfillments DROP CONSTRAINT IF EXISTS fk_fulfillments_tenant;',
    );
    await queryRunner.query(
      'ALTER TABLE fulfillments DROP COLUMN IF EXISTS tenant_id;',
    );

    await queryRunner.query(
      'DROP INDEX IF EXISTS uq_payments_tenant_idempotency_key;',
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_idempotency_key
      ON payments (idempotency_key)
      WHERE idempotency_key IS NOT NULL;
    `);
    await queryRunner.query(
      'ALTER TABLE payments DROP CONSTRAINT IF EXISTS fk_payments_tenant;',
    );
    await queryRunner.query(
      'ALTER TABLE payments DROP COLUMN IF EXISTS tenant_id;',
    );

    await queryRunner.query(
      'DROP INDEX IF EXISTS idx_order_event_outbox_tenant_pending;',
    );
    await queryRunner.query(
      'ALTER TABLE order_event_outbox DROP CONSTRAINT IF EXISTS fk_order_event_outbox_tenant;',
    );
    await queryRunner.query(
      'ALTER TABLE order_event_outbox DROP COLUMN IF EXISTS tenant_id;',
    );

    await queryRunner.query(
      'DROP INDEX IF EXISTS idx_order_items_tenant_order_id_created_at;',
    );
    await queryRunner.query(
      'ALTER TABLE order_items DROP CONSTRAINT IF EXISTS fk_order_items_tenant;',
    );
    await queryRunner.query(
      'ALTER TABLE order_items DROP COLUMN IF EXISTS tenant_id;',
    );

    await queryRunner.query(
      'DROP INDEX IF EXISTS uq_orders_tenant_idempotency_key;',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS idx_orders_tenant_created_at;',
    );
    await queryRunner.query(
      'ALTER TABLE orders DROP CONSTRAINT IF EXISTS fk_orders_tenant;',
    );
    await queryRunner.query(
      'ALTER TABLE orders DROP COLUMN IF EXISTS tenant_id;',
    );

    await queryRunner.query(
      'DROP INDEX IF EXISTS idx_cart_items_tenant_cart_id;',
    );
    await queryRunner.query(
      'ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS fk_cart_items_tenant;',
    );
    await queryRunner.query(
      'ALTER TABLE cart_items DROP COLUMN IF EXISTS tenant_id;',
    );

    await queryRunner.query(
      'DROP INDEX IF EXISTS uq_carts_tenant_user_active;',
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_carts_user_active
      ON carts (user_id)
      WHERE status = 'ACTIVE';
    `);
    await queryRunner.query(
      'DROP INDEX IF EXISTS idx_carts_tenant_user_status;',
    );
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_carts_user_status
      ON carts (user_id, status);
    `);
    await queryRunner.query(
      'ALTER TABLE carts DROP CONSTRAINT IF EXISTS fk_carts_tenant;',
    );
    await queryRunner.query(
      'ALTER TABLE carts DROP COLUMN IF EXISTS tenant_id;',
    );
  }
}
