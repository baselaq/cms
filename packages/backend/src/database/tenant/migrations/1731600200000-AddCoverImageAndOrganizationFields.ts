import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCoverImageAndOrganizationFields1731600200000
  implements MigrationInterface
{
  name = 'AddCoverImageAndOrganizationFields1731600200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE club_settings
      ADD COLUMN IF NOT EXISTS branding_cover_url VARCHAR(255),
      ADD COLUMN IF NOT EXISTS organization_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS organization_description TEXT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE club_settings
      DROP COLUMN IF EXISTS branding_cover_url,
      DROP COLUMN IF EXISTS organization_name,
      DROP COLUMN IF EXISTS organization_description
    `);
  }
}

