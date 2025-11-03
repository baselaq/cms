#!/usr/bin/env node

/**
 * Script to create auth tables in all tenant databases
 * Queries master database to discover tenants and creates tables in each
 */

import { DataSource } from 'typeorm';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as crypto from 'crypto';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
const envPath = join(__dirname, '..', '.env');
try {
  config({ path: envPath });
} catch (error) {
  // .env file is optional
}

// Master database configuration
const MASTER_DB_HOST = process.env.MASTER_DB_HOST || 'localhost';
const MASTER_DB_PORT = parseInt(process.env.MASTER_DB_PORT || '5432', 10);
const MASTER_DB_USER = process.env.MASTER_DB_USER || 'postgres';
const MASTER_DB_PASSWORD = process.env.MASTER_DB_PASSWORD || 'postgres';
const MASTER_DB_NAME = process.env.MASTER_DB_NAME || 'cms_master';

// Encryption key for decrypting tenant passwords
const ENCRYPTION_SECRET =
  process.env.ENCRYPTION_SECRET || 'default-secret-key-change-in-production';

/**
 * Decrypt password (same logic as backend)
 */
function decrypt(encryptedText) {
  const ALGORITHM = 'aes-256-gcm';
  const KEY_LENGTH = 32;
  const key = crypto.pbkdf2Sync(
    ENCRYPTION_SECRET,
    'salt',
    100000,
    KEY_LENGTH,
    'sha512',
  );
  const parts = encryptedText.split(':');

  if (parts.length !== 3) {
    throw new Error('Invalid encrypted text format');
  }

  const iv = Buffer.from(parts[0], 'hex');
  const tag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Create tables in a tenant database
 */
async function createTablesInTenant(tenantConfig) {
  const {
    subdomain,
    db_name,
    db_host,
    db_port,
    db_user,
    db_password_encrypted,
  } = tenantConfig;

  console.log(`\n📦 Setting up tenant: ${subdomain} (${db_name})`);

  try {
    // Decrypt password
    const dbPassword = decrypt(db_password_encrypted);

    // Read SQL script
    const sqlPath = join(__dirname, 'setup-tenant-auth-tables.sql');
    const sqlScript = readFileSync(sqlPath, 'utf-8');

    // Connect to tenant database
    const dataSource = new DataSource({
      type: 'postgres',
      host: db_host,
      port: db_port,
      username: db_user,
      password: dbPassword,
      database: db_name,
    });

    await dataSource.initialize();
    console.log(`   ✅ Connected to ${db_name}`);

    // Execute SQL script
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();

    // Split SQL script by semicolons and execute each statement
    // Remove comments and empty lines
    const cleanScript = sqlScript
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
      .replace(/--.*$/gm, '') // Remove line comments
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s && s.length > 10); // Filter out very short/empty statements

    for (const statement of cleanScript) {
      try {
        await queryRunner.query(statement);
      } catch (error) {
        // Ignore "already exists" errors
        if (
          !error.message.includes('already exists') &&
          !error.message.includes('duplicate')
        ) {
          // Only show warnings for actual errors
          if (
            !error.message.includes('relation') ||
            error.message.includes('does not exist')
          ) {
            console.warn(`   ⚠️  Warning: ${error.message.split('\n')[0]}`);
          }
        }
      }
    }

    // Verify tables exist
    const tables = await queryRunner.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'user_tokens')
    `);

    await queryRunner.release();
    await dataSource.destroy();

    if (tables.length === 2) {
      console.log(`   ✅ Tables created: users, user_tokens`);
      return true;
    } else {
      console.log(
        `   ⚠️  Only found ${tables.length} table(s): ${tables.map((t) => t.table_name).join(', ')}`,
      );
      return false;
    }
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    if (error.message.includes('does not exist')) {
      console.error(
        `   💡 Database ${db_name} might not exist. Create it first.`,
      );
    }
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  const specificTenant =
    process.env.DB_NAME?.replace('_db', '') || process.argv[2];

  console.log('🔧 Setting up tenant database tables...');
  console.log(
    `Master DB: ${MASTER_DB_NAME}@${MASTER_DB_HOST}:${MASTER_DB_PORT}`,
  );
  if (specificTenant) {
    console.log(`Target tenant: ${specificTenant}`);
  }
  console.log('');

  try {
    // Connect to master database
    const masterDataSource = new DataSource({
      type: 'postgres',
      host: MASTER_DB_HOST,
      port: MASTER_DB_PORT,
      username: MASTER_DB_USER,
      password: MASTER_DB_PASSWORD,
      database: MASTER_DB_NAME,
    });

    await masterDataSource.initialize();
    console.log('✅ Connected to master database');

    // Query for active tenants
    let query = `
      SELECT 
        subdomain,
        db_name,
        db_host,
        db_port,
        db_user,
        db_password_encrypted,
        status
      FROM clubs
      WHERE status = 'active'
    `;

    let tenants;
    if (specificTenant) {
      tenants = await masterDataSource.query(query + ` AND subdomain = $1`, [
        specificTenant,
      ]);
    } else {
      tenants = await masterDataSource.query(query);
    }

    if (tenants.length === 0) {
      console.log('\n⚠️  No active tenants found');
      if (specificTenant) {
        console.log(`   Did you mean a different subdomain?`);
      }
      await masterDataSource.destroy();
      process.exit(0);
    }

    console.log(`\n📋 Found ${tenants.length} active tenant(s)\n`);

    // Setup tables for each tenant
    let successCount = 0;
    for (const tenant of tenants) {
      const success = await createTablesInTenant(tenant);
      if (success) successCount++;
    }

    await masterDataSource.destroy();

    console.log('\n' + '='.repeat(50));
    console.log(
      `✅ Setup complete: ${successCount}/${tenants.length} tenant(s) configured`,
    );
    console.log('\n💡 Next step: Create test users');
    console.log('   pnpm create:test-user <email> <password> <subdomain>');
  } catch (error) {
    console.error('\n❌ Error:', error.message);

    if (
      error.message.includes('role') &&
      error.message.includes('does not exist')
    ) {
      console.error('\n💡 Database role/user does not exist.');
      console.error(
        '   Check your .env file or set these environment variables:',
      );
      console.error(`   - MASTER_DB_USER (current: ${MASTER_DB_USER})`);
      console.error(
        `   - MASTER_DB_PASSWORD (current: ${MASTER_DB_PASSWORD ? '***' : 'not set'})`,
      );
      console.error(`   - MASTER_DB_HOST (current: ${MASTER_DB_HOST})`);
      console.error(`   - MASTER_DB_PORT (current: ${MASTER_DB_PORT})`);
      console.error(
        '\n   Common PostgreSQL users: postgres, your_username, or create one:',
      );
      console.error("   CREATE USER postgres WITH PASSWORD 'your_password';");
    } else if (error.message.includes('does not exist')) {
      console.error(
        '\n💡 Master database might not exist. Run setup-master-db.sql first.',
      );
    } else if (error.message.includes('password authentication failed')) {
      console.error('\n💡 Password authentication failed.');
      console.error('   Check MASTER_DB_PASSWORD in your .env file.');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.error('\n💡 Cannot connect to database server.');
      console.error(
        `   Check if PostgreSQL is running on ${MASTER_DB_HOST}:${MASTER_DB_PORT}`,
      );
    }
    process.exit(1);
  }
}

main();
