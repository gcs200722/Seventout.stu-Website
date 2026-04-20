import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCmsAssetsAndSectionTargeting1713083800000 implements MigrationInterface {
  name = 'AddCmsAssetsAndSectionTargeting1713083800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE cms_sections
      ADD COLUMN IF NOT EXISTS targeting JSONB NOT NULL DEFAULT '{}'::jsonb;
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cms_assets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        object_key VARCHAR(512) NOT NULL,
        public_url TEXT NOT NULL,
        mime VARCHAR(128) NOT NULL DEFAULT '',
        alt VARCHAR(512) NOT NULL DEFAULT '',
        focal_x DOUBLE PRECISION NULL,
        focal_y DOUBLE PRECISION NULL,
        width INT NULL,
        height INT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_cms_assets_object_key UNIQUE (object_key)
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_cms_assets_created_at ON cms_assets (created_at DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS cms_assets;`);
    await queryRunner.query(`
      ALTER TABLE cms_sections DROP COLUMN IF EXISTS targeting;
    `);
  }
}
