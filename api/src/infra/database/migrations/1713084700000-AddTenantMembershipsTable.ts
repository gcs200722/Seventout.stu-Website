import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTenantMembershipsTable1713084700000
  implements MigrationInterface
{
  name = 'AddTenantMembershipsTable1713084700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tenant_memberships (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        tenant_id UUID NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'staff',
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_tenant_memberships_user
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_tenant_memberships_tenant
          FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
        CONSTRAINT chk_tenant_memberships_role
          CHECK (role IN ('owner', 'admin', 'staff')),
        CONSTRAINT chk_tenant_memberships_status
          CHECK (status IN ('active', 'invited', 'revoked')),
        CONSTRAINT uq_tenant_memberships_user_tenant
          UNIQUE (user_id, tenant_id)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tenant_memberships_user_status
      ON tenant_memberships (user_id, status);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tenant_memberships_tenant_status
      ON tenant_memberships (tenant_id, status);
    `);

    await queryRunner.query(`
      INSERT INTO tenant_memberships (user_id, tenant_id, role, status)
      SELECT users.id, default_tenant.id, 'owner', 'active'
      FROM users
      CROSS JOIN LATERAL (
        SELECT id
        FROM tenants
        WHERE LOWER(slug) = 'default'
        LIMIT 1
      ) AS default_tenant
      WHERE users.role = 'ADMIN'
      ON CONFLICT (user_id, tenant_id) DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX IF EXISTS idx_tenant_memberships_tenant_status;',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS idx_tenant_memberships_user_status;',
    );
    await queryRunner.query('DROP TABLE IF EXISTS tenant_memberships;');
  }
}
