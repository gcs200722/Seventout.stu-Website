import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCmsPublishPermission1713083600000 implements MigrationInterface {
  name = 'AddCmsPublishPermission1713083600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO permissions (code, description)
      VALUES
        ('CMS_PUBLISH', 'Invalidate CMS published cache / go-live actions')
      ON CONFLICT (code) DO NOTHING;
    `);
    await queryRunner.query(`
      INSERT INTO user_permissions (user_id, permission_code)
      SELECT u.id, 'CMS_PUBLISH'
      FROM users u
      WHERE u.role = 'ADMIN' AND u.deleted_at IS NULL
      ON CONFLICT (user_id, permission_code) DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM user_permissions WHERE permission_code = 'CMS_PUBLISH';
    `);
    await queryRunner.query(`
      DELETE FROM permissions WHERE code = 'CMS_PUBLISH';
    `);
  }
}
