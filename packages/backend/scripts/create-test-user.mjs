#!/usr/bin/env node

/**
 * Script to create a test user in a tenant database
 * Usage: node create-test-user.mjs <email> <password> <subdomain>
 */

import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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
 * Get tenant config from master database
 */
async function getTenantConfig(subdomain) {
  const masterDataSource = new DataSource({
    type: 'postgres',
    host: MASTER_DB_HOST,
    port: MASTER_DB_PORT,
    username: MASTER_DB_USER,
    password: MASTER_DB_PASSWORD,
    database: MASTER_DB_NAME,
  });

  await masterDataSource.initialize();

  const [tenant] = await masterDataSource.query(
    `SELECT * FROM clubs WHERE subdomain = $1 AND status = 'active'`,
    [subdomain],
  );

  await masterDataSource.destroy();

  if (!tenant) {
    throw new Error(`Tenant '${subdomain}' not found or not active`);
  }

  return {
    ...tenant,
    db_password: decrypt(tenant.db_password_encrypted),
  };
}

/**
 * Create user in tenant database
 */
async function createUser(email, password, firstName, lastName, tenantConfig) {
  // Hash password
  console.log('🔐 Hashing password...');
  const hashedPassword = await bcrypt.hash(password, 10);

  // Connect to tenant database
  const tenantDataSource = new DataSource({
    type: 'postgres',
    host: tenantConfig.db_host,
    port: tenantConfig.db_port,
    username: tenantConfig.db_user,
    password: tenantConfig.db_password,
    database: tenantConfig.db_name,
  });

  await tenantDataSource.initialize();
  console.log(`✅ Connected to ${tenantConfig.db_name}`);

  // Check if user already exists
  const [existing] = await tenantDataSource.query(
    `SELECT id, email FROM users WHERE email = $1`,
    [email],
  );

  if (existing) {
    console.log(`⚠️  User with email ${email} already exists`);
    console.log(`   Updating password...`);
    await tenantDataSource.query(
      `UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2`,
      [hashedPassword, email],
    );
    await tenantDataSource.destroy();
    console.log(`✅ Password updated for ${email}`);
    return;
  }

  // Insert new user
  await tenantDataSource.query(
    `INSERT INTO users (email, password, first_name, last_name, status)
     VALUES ($1, $2, $3, $4, 'active')`,
    [email, hashedPassword, firstName || null, lastName || null],
  );

  // Verify user was created
  const [user] = await tenantDataSource.query(
    `SELECT id, email, first_name, last_name, status FROM users WHERE email = $1`,
    [email],
  );

  await tenantDataSource.destroy();

  if (user) {
    console.log(`✅ User created successfully!`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(
      `   Name: ${user.first_name || ''} ${user.last_name || ''}`.trim(),
    );
    console.log(`   Status: ${user.status}`);
  } else {
    throw new Error('User was not created');
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 3) {
    console.error(
      'Usage: node create-test-user.mjs <email> <password> <subdomain> [firstName] [lastName]',
    );
    console.error('');
    console.error('Example:');
    console.error(
      '  node create-test-user.mjs owner@app.com password123 club1 Owner User',
    );
    process.exit(1);
  }

  const [email, password, subdomain, firstName, lastName] = args;

  console.log('🔧 Creating test user...');
  console.log(`Email: ${email}`);
  console.log(`Subdomain: ${subdomain}`);
  console.log('');

  try {
    // Get tenant configuration
    console.log('📋 Fetching tenant configuration...');
    const tenantConfig = await getTenantConfig(subdomain);
    console.log(`✅ Found tenant: ${tenantConfig.db_name}`);

    // Create user
    await createUser(email, password, firstName, lastName, tenantConfig);
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
      console.error(
        '\n   Common PostgreSQL users: postgres, your_username, or create one:',
      );
      console.error("   CREATE USER postgres WITH PASSWORD 'your_password';");
    } else if (error.message.includes('does not exist')) {
      console.error(
        '\n💡 Tenant database might not exist. Run setup:tenant-tables first.',
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
