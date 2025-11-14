-- Connect to master database
\c cms_master;

-- Insert test tenant
INSERT INTO clubs (subdomain, name, db_host, db_port, db_name, db_user, db_password_encrypted, status)
VALUES (
  'club1',
  'Test Club - club1',
  'localhost',
  5432,
  'club1_db',
  'postgres',
  '404748d0c85233ef9b965da404a8d6be:b0eddbd2ae24918c94b6756930e5bcb4:c5224fb65ace939d',
  'active'
)
ON CONFLICT (subdomain) DO UPDATE SET
  name = EXCLUDED.name,
  db_password_encrypted = EXCLUDED.db_password_encrypted,
  updated_at = CURRENT_TIMESTAMP;

-- Create the tenant database if it doesn't exist
SELECT 'CREATE DATABASE club1_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'club1_db')\gexec

-- Verify insertion
SELECT 
  subdomain,
  name,
  db_name,
  status,
  created_at
FROM clubs 
WHERE subdomain = 'club1';
