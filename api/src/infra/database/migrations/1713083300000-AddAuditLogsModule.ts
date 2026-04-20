import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuditLogsModule1713083300000 implements MigrationInterface {
  name = 'AddAuditLogsModule1713083300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        actor_id UUID NULL,
        actor_role VARCHAR(32) NOT NULL,
        action VARCHAR(64) NOT NULL,
        entity_type VARCHAR(64) NOT NULL,
        entity_id UUID NULL,
        metadata JSONB NULL,
        before JSONB NULL,
        after JSONB NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs (actor_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs (entity_type, entity_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC);
    `);

    await queryRunner.query(`
      INSERT INTO permissions (code, description)
      VALUES ('AUDIT_READ', 'Read system audit and activity logs')
      ON CONFLICT (code) DO NOTHING;
    `);

    await queryRunner.query(`
      INSERT INTO user_permissions (user_id, permission_code)
      SELECT id, 'AUDIT_READ'
      FROM users
      WHERE role = 'STAFF'
      ON CONFLICT (user_id, permission_code) DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM user_permissions WHERE permission_code = 'AUDIT_READ';
    `);
    await queryRunner.query(`
      DELETE FROM permissions WHERE code = 'AUDIT_READ';
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS audit_logs;`);
  }
}
