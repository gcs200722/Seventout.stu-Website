import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTenantScopeToRefreshTokens1713084800000
  implements MigrationInterface
{
  name = 'AddTenantScopeToRefreshTokens1713084800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE refresh_tokens
      ADD COLUMN IF NOT EXISTS tenant_id UUID NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE refresh_tokens
      DROP CONSTRAINT IF EXISTS fk_refresh_tokens_tenant;
    `);

    await queryRunner.query(`
      ALTER TABLE refresh_tokens
      ADD CONSTRAINT fk_refresh_tokens_tenant
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_tenant_id
      ON refresh_tokens (tenant_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_refresh_tokens_tenant_id;');
    await queryRunner.query(`
      ALTER TABLE refresh_tokens
      DROP CONSTRAINT IF EXISTS fk_refresh_tokens_tenant;
    `);
    await queryRunner.query(`
      ALTER TABLE refresh_tokens
      DROP COLUMN IF EXISTS tenant_id;
    `);
  }
}
