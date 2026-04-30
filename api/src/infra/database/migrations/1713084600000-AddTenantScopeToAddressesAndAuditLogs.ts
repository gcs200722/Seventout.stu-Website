import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTenantScopeToAddressesAndAuditLogs1713084600000 implements MigrationInterface {
  name = 'AddTenantScopeToAddressesAndAuditLogs1713084600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const defaultTenantSql = `(SELECT id FROM tenants WHERE LOWER(slug) = 'default' LIMIT 1)`;

    await queryRunner.query(`
      ALTER TABLE addresses
      ADD COLUMN IF NOT EXISTS tenant_id UUID;
    `);
    await queryRunner.query(`
      UPDATE addresses
      SET tenant_id = ${defaultTenantSql}
      WHERE tenant_id IS NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE addresses
      ALTER COLUMN tenant_id SET NOT NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE addresses
      DROP CONSTRAINT IF EXISTS fk_addresses_tenant;
    `);
    await queryRunner.query(`
      ALTER TABLE addresses
      ADD CONSTRAINT fk_addresses_tenant
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;
    `);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_addresses_user_id;`);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_addresses_tenant_user_id
      ON addresses (tenant_id, user_id);
    `);
    await queryRunner.query(
      'DROP INDEX IF EXISTS idx_addresses_unique_default_per_user;',
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_addresses_unique_default_per_tenant_user
      ON addresses (tenant_id, user_id)
      WHERE is_default = true AND deleted_at IS NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE audit_logs
      ADD COLUMN IF NOT EXISTS tenant_id UUID;
    `);
    await queryRunner.query(`
      UPDATE audit_logs
      SET tenant_id = ${defaultTenantSql}
      WHERE tenant_id IS NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE audit_logs
      ALTER COLUMN tenant_id SET NOT NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE audit_logs
      DROP CONSTRAINT IF EXISTS fk_audit_logs_tenant;
    `);
    await queryRunner.query(`
      ALTER TABLE audit_logs
      ADD CONSTRAINT fk_audit_logs_tenant
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created_at
      ON audit_logs (tenant_id, created_at DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX IF EXISTS idx_audit_logs_tenant_created_at;',
    );
    await queryRunner.query(
      'ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS fk_audit_logs_tenant;',
    );
    await queryRunner.query(
      'ALTER TABLE audit_logs DROP COLUMN IF EXISTS tenant_id;',
    );

    await queryRunner.query(
      'DROP INDEX IF EXISTS idx_addresses_unique_default_per_tenant_user;',
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_addresses_unique_default_per_user
      ON addresses (user_id)
      WHERE is_default = true AND deleted_at IS NULL;
    `);
    await queryRunner.query(
      'DROP INDEX IF EXISTS idx_addresses_tenant_user_id;',
    );
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_addresses_user_id
      ON addresses (user_id);
    `);
    await queryRunner.query(
      'ALTER TABLE addresses DROP CONSTRAINT IF EXISTS fk_addresses_tenant;',
    );
    await queryRunner.query(
      'ALTER TABLE addresses DROP COLUMN IF EXISTS tenant_id;',
    );
  }
}
