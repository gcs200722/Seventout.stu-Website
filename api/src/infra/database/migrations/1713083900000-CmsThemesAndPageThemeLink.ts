import { MigrationInterface, QueryRunner } from 'typeorm';

export class CmsThemesAndPageThemeLink1713083900000 implements MigrationInterface {
  name = 'CmsThemesAndPageThemeLink1713083900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cms_themes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        slug VARCHAR(64) NOT NULL,
        name VARCHAR(255) NOT NULL,
        tokens JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_cms_themes_slug UNIQUE (slug)
      );
    `);
    await queryRunner.query(`
      ALTER TABLE cms_pages
      ADD COLUMN IF NOT EXISTS theme_id UUID NULL
      REFERENCES cms_themes(id) ON DELETE SET NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_cms_pages_theme_id ON cms_pages(theme_id);
    `);
    await queryRunner.query(`
      INSERT INTO cms_themes (slug, name, tokens)
      VALUES ('default', 'Default', '{}'::jsonb)
      ON CONFLICT (slug) DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE cms_pages DROP COLUMN IF EXISTS theme_id;
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS cms_themes;`);
  }
}
