import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationModulePhase11713080000000 implements MigrationInterface {
  name = 'AddNotificationModulePhase11713080000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        recipient_email VARCHAR(255) NULL,
        type VARCHAR(64) NOT NULL,
        title VARCHAR(160) NOT NULL,
        content TEXT NOT NULL,
        channel VARCHAR(16) NOT NULL,
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        event_source VARCHAR(64) NOT NULL,
        event_id VARCHAR(120) NOT NULL,
        read_at TIMESTAMPTZ NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_notifications_user
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_dedupe
      ON notifications (event_source, event_id, channel, user_id, type);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id_created_at
      ON notifications (user_id, created_at DESC);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_is_read_created_at
      ON notifications (is_read, created_at DESC);
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS notification_delivery_attempts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        notification_id UUID NOT NULL,
        status VARCHAR(32) NOT NULL,
        error_message TEXT NULL,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_notification_attempts_notification
          FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_notification_attempts_notification_id
      ON notification_delivery_attempts (notification_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_notification_attempts_created_at
      ON notification_delivery_attempts (created_at DESC);
    `);

    await queryRunner.query(`
      INSERT INTO permissions (code, description)
      VALUES
        ('NOTIFICATION_READ', 'Read notification information'),
        ('NOTIFICATION_MANAGE', 'Manage notification operations')
      ON CONFLICT (code) DO NOTHING;
    `);
    await queryRunner.query(`
      INSERT INTO user_permissions (user_id, permission_code)
      SELECT id, 'NOTIFICATION_READ'
      FROM users
      WHERE role IN ('USER', 'STAFF', 'ADMIN')
      ON CONFLICT (user_id, permission_code) DO NOTHING;
    `);
    await queryRunner.query(`
      INSERT INTO user_permissions (user_id, permission_code)
      SELECT id, 'NOTIFICATION_MANAGE'
      FROM users
      WHERE role = 'ADMIN'
      ON CONFLICT (user_id, permission_code) DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM user_permissions
      WHERE permission_code IN ('NOTIFICATION_READ', 'NOTIFICATION_MANAGE');
    `);
    await queryRunner.query(`
      DELETE FROM permissions
      WHERE code IN ('NOTIFICATION_READ', 'NOTIFICATION_MANAGE');
    `);
    await queryRunner.query(
      'DROP INDEX IF EXISTS idx_notification_attempts_created_at;',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS idx_notification_attempts_notification_id;',
    );
    await queryRunner.query(
      'DROP TABLE IF EXISTS notification_delivery_attempts;',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS idx_notifications_is_read_created_at;',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS idx_notifications_user_id_created_at;',
    );
    await queryRunner.query('DROP INDEX IF EXISTS uq_notifications_dedupe;');
    await queryRunner.query('DROP TABLE IF EXISTS notifications;');
  }
}
