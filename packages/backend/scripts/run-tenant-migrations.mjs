#!/usr/bin/env node

/**
 * Script to add cover image and organization fields to all existing tenant databases
 * Also creates branches table if it doesn't exist
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
 * Add cover image and organization fields to a tenant database
 */
async function addCoverImageAndOrganizationFields(tenantConfig) {
  const {
    subdomain,
    db_name,
    db_host,
    db_port,
    db_user,
    db_password_encrypted,
  } = tenantConfig;

  console.log(`\n📦 Adding cover image and organization fields to tenant: ${subdomain} (${db_name})`);

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

    const queryRunner = dataSource.createQueryRunner();
    
    // Add columns to club_settings
    await queryRunner.query(`
      ALTER TABLE club_settings
      ADD COLUMN IF NOT EXISTS branding_cover_url VARCHAR(255),
      ADD COLUMN IF NOT EXISTS organization_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS organization_description TEXT
    `);
    console.log(`   ✅ Added branding_cover_url, organization_name, and organization_description columns`);

    // Create branches table if it doesn't exist
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
    console.log(`   ✅ Created branches table`);

    // Create index on branches.slug
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_branches_slug ON branches(slug);`
    );
    console.log(`   ✅ Created index on branches.slug`);

    await dataSource.destroy();
    console.log(`   ✅ Migration completed for ${subdomain}`);
    return true;
  } catch (error) {
    console.error(`   ❌ Error migrating ${subdomain}:`, error.message);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting cover image and organization fields migration for all tenants...\n');

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
      WHERE status = 'active'
      ORDER BY subdomain
    `);

    if (clubs.length === 0) {
      console.log('⚠️  No active tenants found in master database');
      await masterDataSource.destroy();
      process.exit(0);
    }

    console.log(`📋 Found ${clubs.length} active tenant(s) to migrate\n`);

    // Process each tenant
    let successCount = 0;
    let failCount = 0;

    for (const club of clubs) {
      const success = await addCoverImageAndOrganizationFields(club);
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

