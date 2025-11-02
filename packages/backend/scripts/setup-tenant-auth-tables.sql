-- Tenant Database Auth Tables Setup Script
-- Run this script in each tenant database to create users and user_tokens tables

-- Create users table
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
);

-- Create indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Create user_tokens table
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
);

-- Create indexes for user_tokens table
CREATE INDEX IF NOT EXISTS idx_user_tokens_user_id ON user_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tokens_token ON user_tokens(token);
CREATE INDEX IF NOT EXISTS idx_user_tokens_expires_at ON user_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_tokens_revoked_at ON user_tokens(revoked_at);

-- Example: Insert a test user (uncomment and update after hashing password)
/*
-- First, hash the password using bcrypt (or use a tool to generate hash)
-- Example: password 'admin123' hashed with bcrypt
INSERT INTO users (email, password, first_name, last_name, status)
VALUES (
  'admin@example.com',
  '$2b$10$YourHashedPasswordHere',
  'Admin',
  'User',
  'active'
);
*/

-- Verify the setup
SELECT 'Auth tables setup complete!' as status;
SELECT COUNT(*) as users_count FROM users;
SELECT COUNT(*) as tokens_count FROM user_tokens;

