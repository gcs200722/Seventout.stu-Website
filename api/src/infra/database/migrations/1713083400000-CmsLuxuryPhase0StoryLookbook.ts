import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 0 luxury CMS: new section/block types (STORY_CHAPTER, LOOKBOOK_MOSAIC,
 * BRAND_STORY, LOOKBOOK) are stored as varchar values — no DB column change.
 * Migration kept as a versioned checkpoint for deployments.
 */
export class CmsLuxuryPhase0StoryLookbook1713083400000 implements MigrationInterface {
  name = 'CmsLuxuryPhase0StoryLookbook1713083400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`SELECT 1`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`SELECT 1`);
  }
}
