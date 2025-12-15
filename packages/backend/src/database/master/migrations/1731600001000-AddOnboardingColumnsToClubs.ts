import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOnboardingColumnsToClubs1731600001000
  implements MigrationInterface
{
  name = 'AddOnboardingColumnsToClubs1731600001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE clubs
      ADD COLUMN IF NOT EXISTS onboarding_token_hash VARCHAR(128),
      ADD COLUMN IF NOT EXISTS onboarding_token_expires_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS onboarding_status VARCHAR(20) NOT NULL DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP
    `);

    await queryRunner.query(`
      UPDATE clubs
      SET onboarding_status = 'completed',
          onboarding_completed_at = CASE
            WHEN status = 'active' THEN COALESCE(onboarding_completed_at, NOW())
            ELSE onboarding_completed_at
          END
      WHERE onboarding_status = 'pending' OR onboarding_status IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE clubs
      DROP COLUMN IF EXISTS onboarding_token_hash,
      DROP COLUMN IF EXISTS onboarding_token_expires_at,
      DROP COLUMN IF EXISTS onboarding_status,
      DROP COLUMN IF EXISTS onboarding_completed_at
    `);
  }
}
