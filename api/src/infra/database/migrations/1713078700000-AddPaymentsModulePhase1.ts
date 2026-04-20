import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentsModulePhase11713078700000 implements MigrationInterface {
  name = 'AddPaymentsModulePhase11713078700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL,
        method VARCHAR(20) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        amount INT NOT NULL,
        transaction_id VARCHAR(120) NULL,
        idempotency_key VARCHAR(120) NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ NULL,
        CONSTRAINT fk_payments_order
          FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      ALTER TABLE payments
      ADD CONSTRAINT chk_payments_amount_nonnegative
      CHECK (amount >= 0) NOT VALID;
    `);
    await queryRunner.query(`
      ALTER TABLE payments
      VALIDATE CONSTRAINT chk_payments_amount_nonnegative;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_payments_order_id_created_at
      ON payments (order_id, created_at DESC)
      WHERE deleted_at IS NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_payments_status_created_at
      ON payments (status, created_at DESC)
      WHERE deleted_at IS NULL;
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_idempotency_key
      ON payments (idempotency_key)
      WHERE idempotency_key IS NOT NULL;
    `);

    await queryRunner.query(`
      INSERT INTO permissions (code, description)
      VALUES
        ('PAYMENT_CREATE', 'Create payment for order'),
        ('PAYMENT_READ', 'Read payment information'),
        ('PAYMENT_MANAGE', 'Manage payment lifecycle')
      ON CONFLICT (code) DO NOTHING;
    `);

    await queryRunner.query(`
      INSERT INTO user_permissions (user_id, permission_code)
      SELECT id, 'PAYMENT_CREATE'
      FROM users
      WHERE role = 'USER'
      ON CONFLICT (user_id, permission_code) DO NOTHING;
    `);
    await queryRunner.query(`
      INSERT INTO user_permissions (user_id, permission_code)
      SELECT id, 'PAYMENT_READ'
      FROM users
      WHERE role = 'USER'
      ON CONFLICT (user_id, permission_code) DO NOTHING;
    `);
    await queryRunner.query(`
      INSERT INTO user_permissions (user_id, permission_code)
      SELECT id, 'PAYMENT_READ'
      FROM users
      WHERE role = 'STAFF'
      ON CONFLICT (user_id, permission_code) DO NOTHING;
    `);
    await queryRunner.query(`
      INSERT INTO user_permissions (user_id, permission_code)
      SELECT id, 'PAYMENT_MANAGE'
      FROM users
      WHERE role = 'STAFF'
      ON CONFLICT (user_id, permission_code) DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM user_permissions
      WHERE permission_code IN ('PAYMENT_CREATE', 'PAYMENT_READ', 'PAYMENT_MANAGE');
    `);
    await queryRunner.query(`
      DELETE FROM permissions
      WHERE code IN ('PAYMENT_CREATE', 'PAYMENT_READ', 'PAYMENT_MANAGE');
    `);
    await queryRunner.query(
      'DROP INDEX IF EXISTS uq_payments_idempotency_key;',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS idx_payments_status_created_at;',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS idx_payments_order_id_created_at;',
    );
    await queryRunner.query(
      'ALTER TABLE payments DROP CONSTRAINT IF EXISTS chk_payments_amount_nonnegative;',
    );
    await queryRunner.query('DROP TABLE IF EXISTS payments;');
  }
}
