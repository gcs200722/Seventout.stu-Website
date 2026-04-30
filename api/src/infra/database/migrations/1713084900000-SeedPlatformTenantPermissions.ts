import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedPlatformTenantPermissions1713084900000
  implements MigrationInterface
{
  name = 'SeedPlatformTenantPermissions1713084900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO permissions (code, description)
      VALUES
        ('PLATFORM_TENANT_READ', 'Read tenants in platform scope'),
        ('PLATFORM_TENANT_MANAGE', 'Manage tenants in platform scope')
      ON CONFLICT (code) DO NOTHING;
    `);

    await queryRunner.query(`
      INSERT INTO user_permissions (user_id, permission_code)
      SELECT u.id, p.code
      FROM users u
      CROSS JOIN (
        SELECT code
        FROM permissions
        WHERE code IN ('PLATFORM_TENANT_READ', 'PLATFORM_TENANT_MANAGE')
      ) p
      WHERE u.role = 'ADMIN'
      ON CONFLICT (user_id, permission_code) DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM user_permissions
      WHERE permission_code IN ('PLATFORM_TENANT_READ', 'PLATFORM_TENANT_MANAGE');
    `);
    await queryRunner.query(`
      DELETE FROM permissions
      WHERE code IN ('PLATFORM_TENANT_READ', 'PLATFORM_TENANT_MANAGE');
    `);
  }
}
