import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPasswordResetFields1731600100000
  implements MigrationInterface
{
  name = 'AddPasswordResetFields1731600100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255),
      ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMP
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token);`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_users_password_reset_token;`,
    );
    await queryRunner.query(`
      ALTER TABLE users
      DROP COLUMN IF EXISTS password_reset_token,
      DROP COLUMN IF EXISTS password_reset_expires_at
    `);
  }
}

