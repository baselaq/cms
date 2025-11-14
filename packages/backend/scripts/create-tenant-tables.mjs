#!/usr/bin/env node

/**
 * Script to create auth tables in tenant database
 * Uses the same connection logic as the backend
 */

import { DataSource } from 'typeorm';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
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

const DB_NAME = process.env.DB_NAME || 'club1_db';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '5432', 10);
const DB_USER = process.env.DB_USER || process.env.MASTER_DB_USER || 'postgres';
const DB_PASSWORD =
  process.env.DB_PASSWORD || process.env.MASTER_DB_PASSWORD || 'postgres';

console.log('🔧 Creating auth tables in tenant database...');
console.log(`Database: ${DB_NAME}`);
console.log(`Host: ${DB_HOST}:${DB_PORT}`);
console.log(`User: ${DB_USER}`);
console.log('');

try {
  // Read the SQL script
  const sqlPath = join(__dirname, 'setup-tenant-auth-tables.sql');
  const sqlScript = readFileSync(sqlPath, 'utf-8');

  // Create a temporary connection to run the SQL
  const dataSource = new DataSource({
    type: 'postgres',
    host: DB_HOST,
    port: DB_PORT,
    username: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
  });

  await dataSource.initialize();
  console.log('✅ Connected to database');

  // Use query runner for better SQL execution
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
          console.warn(`⚠️  Warning: ${error.message.split('\n')[0]}`);
        }
      }
    }
  }

  await queryRunner.release();

  // Verify tables were created
  const tables = await dataSource.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('users', 'user_tokens')
  `);

  console.log('');
  if (tables.length === 2) {
    console.log('✅ Auth tables created successfully!');
    console.log('   - users');
    console.log('   - user_tokens');
  } else {
    console.log('⚠️  Some tables may not have been created:');
    console.log(
      `   Found tables: ${tables.map((t) => t.table_name).join(', ')}`,
    );
  }

  await dataSource.destroy();
  console.log('');
  console.log('💡 Next: Create a test user');
  console.log('   You can use: node scripts/encrypt-password.mjs <password>');
} catch (error) {
  console.error('❌ Error:', error.message);

  if (
    error.message.includes('role') &&
    error.message.includes('does not exist')
  ) {
    console.error('\n💡 Database role/user does not exist.');
    console.error(
      '   Check your .env file or set these environment variables:',
    );
    console.error(`   - DB_USER or MASTER_DB_USER (current: ${DB_USER})`);
    console.error(
      `   - DB_PASSWORD or MASTER_DB_PASSWORD (current: ${DB_PASSWORD ? '***' : 'not set'})`,
    );
    console.error(`   - DB_HOST (current: ${DB_HOST})`);
    console.error(`   - DB_PORT (current: ${DB_PORT})`);
    console.error(
      '\n   Common PostgreSQL users: postgres, your_username, or create one:',
    );
    console.error("   CREATE USER postgres WITH PASSWORD 'your_password';");
  } else if (error.message.includes('password authentication failed')) {
    console.error('\n💡 Password authentication failed.');
    console.error(
      '   Check DB_PASSWORD or MASTER_DB_PASSWORD in your .env file.',
    );
  } else if (error.message.includes('ECONNREFUSED')) {
    console.error('\n💡 Cannot connect to database server.');
    console.error(`   Check if PostgreSQL is running on ${DB_HOST}:${DB_PORT}`);
  } else if (error.message.includes('does not exist')) {
    console.error('\n💡 Database might not exist. Create it first:');
    console.error(`   createdb -U ${DB_USER} ${DB_NAME}`);
  }

  process.exit(1);
}
