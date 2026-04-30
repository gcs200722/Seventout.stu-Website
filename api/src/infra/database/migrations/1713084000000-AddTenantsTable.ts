import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTenantsTable1713084000000 implements MigrationInterface {
  name = 'AddTenantsTable1713084000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        slug VARCHAR(120) NOT NULL,
        name VARCHAR(255) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT chk_tenants_status CHECK (status IN ('active', 'suspended'))
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_slug_lower
      ON tenants (LOWER(slug));
    `);

    await queryRunner.query(`
      INSERT INTO tenants (slug, name, status)
      SELECT 'default', 'Default Tenant', 'active'
      WHERE NOT EXISTS (
        SELECT 1 FROM tenants WHERE LOWER(slug) = 'default'
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS tenants;');
  }
}
