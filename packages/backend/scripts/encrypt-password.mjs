#!/usr/bin/env node

/**
 * Utility script to encrypt passwords for tenant database credentials
 * Usage: node scripts/encrypt-password.mjs <plain_password>
 */

import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Simple encryption function (same as in utils/encryption.util.ts)
function encrypt(text, secret) {
  const ALGORITHM = 'aes-256-gcm';
  const IV_LENGTH = 16;
  const KEY_LENGTH = 32;

  const key = crypto.pbkdf2Sync(secret, 'salt', 100000, KEY_LENGTH, 'sha512');
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const tag = cipher.getAuthTag();

  return iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted;
}

const password = process.argv[2];
const secret =
  process.env.ENCRYPTION_SECRET || 'default-secret-key-change-in-production';

if (!password) {
  console.error('Usage: node scripts/encrypt-password.mjs <password>');
  console.error(
    'Or set ENCRYPTION_SECRET environment variable for custom secret',
  );
  process.exit(1);
}

try {
  const encrypted = encrypt(password, secret);
  console.log('\n✅ Encrypted password:');
  console.log(encrypted);
  console.log(
    '\n💡 Use this value for db_password_encrypted in the clubs table\n',
  );
} catch (error) {
  console.error('❌ Error encrypting password:', error.message);
  process.exit(1);
}
