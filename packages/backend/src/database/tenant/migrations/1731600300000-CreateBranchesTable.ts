import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBranchesTable1731600300000 implements MigrationInterface {
  name = 'CreateBranchesTable1731600300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS branches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        slug VARCHAR(150) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        address VARCHAR(255),
        city VARCHAR(100),
        state VARCHAR(50),
        zip_code VARCHAR(20),
        country VARCHAR(100),
        phone VARCHAR(20),
        email VARCHAR(255),
        website VARCHAR(255),
        timezone VARCHAR(100) DEFAULT 'America/New_York',
        is_active BOOLEAN DEFAULT TRUE,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_branches_slug ON branches(slug);`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS branches;`);
  }
}

