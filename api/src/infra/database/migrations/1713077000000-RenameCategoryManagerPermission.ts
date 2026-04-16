import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameCategoryManagerPermission1713077000000 implements MigrationInterface {
  name = 'RenameCategoryManagerPermission1713077000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO permissions (code, description)
      VALUES ('CATEGORY_MANAGE', 'Manage categories')
      ON CONFLICT (code) DO NOTHING;
    `);

    await queryRunner.query(`
      UPDATE user_permissions
      SET permission_code = 'CATEGORY_MANAGE'
      WHERE permission_code = 'CATEGORY_MANAGER';
    `);

    await queryRunner.query(`
      DELETE FROM permissions
      WHERE code = 'CATEGORY_MANAGER';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO permissions (code, description)
      VALUES ('CATEGORY_MANAGER', 'Manage categories')
      ON CONFLICT (code) DO NOTHING;
    `);

    await queryRunner.query(`
      UPDATE user_permissions
      SET permission_code = 'CATEGORY_MANAGER'
      WHERE permission_code = 'CATEGORY_MANAGE';
    `);

    await queryRunner.query(`
      DELETE FROM permissions
      WHERE code = 'CATEGORY_MANAGE';
    `);
  }
}
