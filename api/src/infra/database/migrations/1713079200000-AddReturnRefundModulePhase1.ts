import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReturnRefundModulePhase11713079200000 implements MigrationInterface {
  name = 'AddReturnRefundModulePhase11713079200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS returns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL,
        user_id UUID NOT NULL,
        reason VARCHAR(500) NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'REQUESTED',
        note TEXT NOT NULL DEFAULT '',
        requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        approved_at TIMESTAMPTZ NULL,
        rejected_at TIMESTAMPTZ NULL,
        received_at TIMESTAMPTZ NULL,
        completed_at TIMESTAMPTZ NULL,
        canceled_at TIMESTAMPTZ NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ NULL,
        CONSTRAINT fk_returns_order
          FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        CONSTRAINT fk_returns_user
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_returns_order_id
      ON returns (order_id)
      WHERE deleted_at IS NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_returns_user_id_created_at
      ON returns (user_id, created_at DESC)
      WHERE deleted_at IS NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_returns_status_created_at
      ON returns (status, created_at DESC)
      WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS refunds (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        return_id UUID NOT NULL,
        order_id UUID NOT NULL,
        amount INT NOT NULL,
        method VARCHAR(32) NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
        processed_at TIMESTAMPTZ NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ NULL,
        CONSTRAINT fk_refunds_return
          FOREIGN KEY (return_id) REFERENCES returns(id) ON DELETE CASCADE,
        CONSTRAINT fk_refunds_order
          FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      ALTER TABLE refunds
      ADD CONSTRAINT chk_refunds_amount_nonnegative
      CHECK (amount >= 0) NOT VALID;
    `);
    await queryRunner.query(`
      ALTER TABLE refunds
      VALIDATE CONSTRAINT chk_refunds_amount_nonnegative;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_refunds_return_id_created_at
      ON refunds (return_id, created_at DESC)
      WHERE deleted_at IS NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_refunds_order_id_created_at
      ON refunds (order_id, created_at DESC)
      WHERE deleted_at IS NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_refunds_status_created_at
      ON refunds (status, created_at DESC)
      WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      INSERT INTO permissions (code, description)
      VALUES
        ('RETURN_CREATE', 'Create return request'),
        ('RETURN_READ', 'Read return information'),
        ('RETURN_UPDATE', 'Update return lifecycle'),
        ('REFUND_CREATE', 'Create refund transaction'),
        ('REFUND_READ', 'Read refund information'),
        ('REFUND_UPDATE', 'Update refund status')
      ON CONFLICT (code) DO NOTHING;
    `);

    await queryRunner.query(`
      INSERT INTO user_permissions (user_id, permission_code)
      SELECT id, 'RETURN_CREATE'
      FROM users
      WHERE role = 'USER'
      ON CONFLICT (user_id, permission_code) DO NOTHING;
    `);
    await queryRunner.query(`
      INSERT INTO user_permissions (user_id, permission_code)
      SELECT id, 'RETURN_READ'
      FROM users
      WHERE role IN ('USER', 'STAFF')
      ON CONFLICT (user_id, permission_code) DO NOTHING;
    `);
    await queryRunner.query(`
      INSERT INTO user_permissions (user_id, permission_code)
      SELECT id, 'RETURN_UPDATE'
      FROM users
      WHERE role = 'STAFF'
      ON CONFLICT (user_id, permission_code) DO NOTHING;
    `);
    await queryRunner.query(`
      INSERT INTO user_permissions (user_id, permission_code)
      SELECT id, 'REFUND_READ'
      FROM users
      WHERE role = 'USER'
      ON CONFLICT (user_id, permission_code) DO NOTHING;
    `);
    await queryRunner.query(`
      INSERT INTO user_permissions (user_id, permission_code)
      SELECT id, 'REFUND_CREATE'
      FROM users
      WHERE role = 'STAFF'
      ON CONFLICT (user_id, permission_code) DO NOTHING;
    `);
    await queryRunner.query(`
      INSERT INTO user_permissions (user_id, permission_code)
      SELECT id, 'REFUND_UPDATE'
      FROM users
      WHERE role = 'STAFF'
      ON CONFLICT (user_id, permission_code) DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM user_permissions
      WHERE permission_code IN (
        'RETURN_CREATE',
        'RETURN_READ',
        'RETURN_UPDATE',
        'REFUND_CREATE',
        'REFUND_READ',
        'REFUND_UPDATE'
      );
    `);
    await queryRunner.query(`
      DELETE FROM permissions
      WHERE code IN (
        'RETURN_CREATE',
        'RETURN_READ',
        'RETURN_UPDATE',
        'REFUND_CREATE',
        'REFUND_READ',
        'REFUND_UPDATE'
      );
    `);
    await queryRunner.query(
      'DROP INDEX IF EXISTS idx_refunds_status_created_at;',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS idx_refunds_order_id_created_at;',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS idx_refunds_return_id_created_at;',
    );
    await queryRunner.query(
      'ALTER TABLE refunds DROP CONSTRAINT IF EXISTS chk_refunds_amount_nonnegative;',
    );
    await queryRunner.query('DROP TABLE IF EXISTS refunds;');
    await queryRunner.query(
      'DROP INDEX IF EXISTS idx_returns_status_created_at;',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS idx_returns_user_id_created_at;',
    );
    await queryRunner.query('DROP INDEX IF EXISTS uq_returns_order_id;');
    await queryRunner.query('DROP TABLE IF EXISTS returns;');
  }
}
