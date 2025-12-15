import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTenantBaseTables1731600000000 implements MigrationInterface {
  name = 'CreateTenantBaseTables1731600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
        last_login_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        device VARCHAR(255),
        ip_address VARCHAR(255),
        revoked_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_user_tokens_user_id ON user_tokens(user_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_user_tokens_token ON user_tokens(token);`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_user_tokens_expires_at ON user_tokens(expires_at);`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_user_tokens_revoked_at ON user_tokens(revoked_at);`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS permissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) UNIQUE NOT NULL,
        module VARCHAR(50) NOT NULL,
        action VARCHAR(50) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_permissions_name ON permissions(name);`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_permissions_module ON permissions(module);`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, role_id)
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(role_id, permission_id)
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS club_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        theme_mode VARCHAR(50) DEFAULT 'system',
        primary_color VARCHAR(7) DEFAULT '#111827',
        secondary_color VARCHAR(7) DEFAULT '#0ea5e9',
        accent_color VARCHAR(7) DEFAULT '#f97316',
        timezone VARCHAR(100) DEFAULT 'America/New_York',
        locale VARCHAR(10) DEFAULT 'en-US',
        onboarding_complete BOOLEAN DEFAULT FALSE,
        onboarding_step VARCHAR(50) DEFAULT 'club-info',
        onboarding_completed_at TIMESTAMP,
        branding_logo_url VARCHAR(255),
        support_email VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS club_plans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        plan_code VARCHAR(50) UNIQUE NOT NULL,
        plan_name VARCHAR(100) NOT NULL,
        status VARCHAR(20) DEFAULT 'trialing' CHECK (status IN ('trialing','active','canceled')),
        billing_cycle VARCHAR(20) DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly','annual')),
        member_limit INTEGER DEFAULT 25,
        coach_limit INTEGER DEFAULT 5,
        monthly_price NUMERIC(10,2) DEFAULT 0,
        trial_ends_at TIMESTAMP,
        activated_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS teams (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(150) NOT NULL,
        slug VARCHAR(150) UNIQUE NOT NULL,
        sport VARCHAR(50) DEFAULT 'soccer',
        age_group VARCHAR(50) DEFAULT 'U12',
        gender VARCHAR(20) DEFAULT 'coed',
        season VARCHAR(100) DEFAULT 'fall',
        home_venue VARCHAR(255),
        primary_color VARCHAR(7) DEFAULT '#0ea5e9',
        secondary_color VARCHAR(7) DEFAULT '#111827',
        timezone VARCHAR(150) DEFAULT 'America/New_York',
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS club_invites (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        role VARCHAR(50) DEFAULT 'staff',
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','accepted','expired','revoked')),
        invite_token VARCHAR(128),
        invited_by VARCHAR(255),
        accepted_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS club_invites;`);
    await queryRunner.query(`DROP TABLE IF EXISTS teams;`);
    await queryRunner.query(`DROP TABLE IF EXISTS club_plans;`);
    await queryRunner.query(`DROP TABLE IF EXISTS club_settings;`);
    await queryRunner.query(`DROP TABLE IF EXISTS role_permissions;`);
    await queryRunner.query(`DROP TABLE IF EXISTS user_roles;`);
    await queryRunner.query(`DROP TABLE IF EXISTS permissions;`);
    await queryRunner.query(`DROP TABLE IF EXISTS roles;`);
    await queryRunner.query(`DROP TABLE IF EXISTS user_tokens;`);
    await queryRunner.query(`DROP TABLE IF EXISTS users;`);
  }
}
