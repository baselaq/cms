-- Master Database Setup Script
-- Run this in PostgreSQL to set up the master database and clubs table

-- Create master database (run this separately if needed)
-- CREATE DATABASE cms_master;

-- Connect to master database
\c cms_master;

-- Create clubs table
CREATE TABLE IF NOT EXISTS clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subdomain VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  db_host VARCHAR(255) NOT NULL,
  db_port INTEGER NOT NULL DEFAULT 5432,
  db_name VARCHAR(255) NOT NULL,
  db_user VARCHAR(255) NOT NULL,
  db_password_encrypted TEXT NOT NULL,
  connection_pool_size INTEGER DEFAULT 10,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_clubs_subdomain ON clubs(subdomain);
CREATE INDEX IF NOT EXISTS idx_clubs_status ON clubs(status);

-- Example: Insert a test club (uncomment and update after encrypting password)
/*
-- First, encrypt the password using: node scripts/encrypt-password.mjs your_password
-- Then insert:
INSERT INTO clubs (subdomain, name, db_host, db_port, db_name, db_user, db_password_encrypted, status)
VALUES (
  'club1',
  'Test Club 1',
  'localhost',
  5432,
  'club1_db',
  'postgres',
  '<YOUR_ENCRYPTED_PASSWORD_HERE>',
  'active'
);
*/

-- Verify the setup
SELECT 'Master database setup complete!' as status;
SELECT COUNT(*) as clubs_count FROM clubs;

