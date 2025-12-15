#!/usr/bin/env node

/**
 * Script to add password reset fields to all existing tenant databases
 * Queries master database to discover tenants and adds columns to each
 */

import { DataSource } from 'typeorm';
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
 * Add password reset fields to a tenant database
 */
async function addPasswordResetFields(tenantConfig) {
  const {
    subdomain,
    db_name,
    db_host,
    db_port,
    db_user,
    db_password_encrypted,
  } = tenantConfig;

  console.log(`\n📦 Adding password reset fields to tenant: ${subdomain} (${db_name})`);

  try {
    // Decrypt password
    const dbPassword = decrypt(db_password_encrypted);

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

    // Run migration SQL
    const queryRunner = dataSource.createQueryRunner();
    
    // Add columns
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255),
      ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMP
    `);
    console.log(`   ✅ Added password_reset_token and password_reset_expires_at columns`);

    // Create index
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token);`
    );
    console.log(`   ✅ Created index on password_reset_token`);

    await dataSource.destroy();
    console.log(`   ✅ Migration completed for ${subdomain}`);
    return true;
  } catch (error) {
    console.error(`   ❌ Error adding password reset fields to ${subdomain}:`, error.message);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting password reset fields migration for all tenants...\n');

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
    console.log(`✅ Connected to master database: ${MASTER_DB_NAME}\n`);

    // Query all clubs (tenants)
    const clubs = await masterDataSource.query(`
      SELECT 
        subdomain,
        db_name,
        db_host,
        db_port,
        db_user,
        db_password_encrypted
      FROM clubs
      ORDER BY subdomain
    `);

    if (clubs.length === 0) {
      console.log('⚠️  No tenants found in master database');
      await masterDataSource.destroy();
      process.exit(0);
    }

    console.log(`📋 Found ${clubs.length} tenant(s) to migrate\n`);

    // Process each tenant
    let successCount = 0;
    let failCount = 0;

    for (const club of clubs) {
      const success = await addPasswordResetFields(club);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
    }

    await masterDataSource.destroy();

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📊 Migration Summary:');
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(`   📦 Total: ${clubs.length}`);
    console.log('═══════════════════════════════════════════════════════════\n');

    if (failCount > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run script
main();

