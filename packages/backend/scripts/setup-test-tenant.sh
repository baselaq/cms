#!/bin/bash

# Setup script to create test tenant database and insert test data
# Usage: ./scripts/setup-test-tenant.sh [subdomain] [db_password]

SUBDOMAIN="${1:-club1}"
DB_PASSWORD="${2:-postgres}"
DB_NAME="${SUBDOMAIN}_db"

echo "🔧 Setting up test tenant..."
echo "Subdomain: ${SUBDOMAIN}"
echo "Database: ${DB_NAME}"
echo ""

# Check if password encryption script exists
ENCRYPT_SCRIPT="scripts/encrypt-password.mjs"
if [ ! -f "$ENCRYPT_SCRIPT" ]; then
  echo "❌ Error: $ENCRYPT_SCRIPT not found"
  exit 1
fi

# Encrypt password
echo "🔐 Encrypting database password..."
ENCRYPTED_PASSWORD=$(node "$ENCRYPT_SCRIPT" "$DB_PASSWORD" 2>/dev/null | grep -v "✅\|💡\|Encrypted\|^$" | tr -d '\n')

if [ -z "$ENCRYPTED_PASSWORD" ]; then
  echo "❌ Failed to encrypt password"
  exit 1
fi

echo "✅ Password encrypted"
echo ""

# Create SQL script
SQL_FILE="scripts/insert-test-tenant.sql"
cat > "$SQL_FILE" <<EOF
-- Connect to master database
\c cms_master;

-- Insert test tenant
INSERT INTO clubs (subdomain, name, db_host, db_port, db_name, db_user, db_password_encrypted, status)
VALUES (
  '${SUBDOMAIN}',
  'Test Club - ${SUBDOMAIN}',
  'localhost',
  5432,
  '${DB_NAME}',
  'postgres',
  '${ENCRYPTED_PASSWORD}',
  'active'
)
ON CONFLICT (subdomain) DO UPDATE SET
  name = EXCLUDED.name,
  db_password_encrypted = EXCLUDED.db_password_encrypted,
  updated_at = CURRENT_TIMESTAMP;

-- Create the tenant database if it doesn't exist
SELECT 'CREATE DATABASE ${DB_NAME}'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${DB_NAME}')\gexec

-- Verify insertion
SELECT 
  subdomain,
  name,
  db_name,
  status,
  created_at
FROM clubs 
WHERE subdomain = '${SUBDOMAIN}';
EOF

echo "📝 SQL script created: $SQL_FILE"
echo ""
echo "💡 Run this SQL script in PostgreSQL:"
echo "   psql -U postgres -f $SQL_FILE"
echo ""
echo "Or copy and paste the SQL into psql:"
echo "─────────────────────────────────────"
cat "$SQL_FILE"
echo "─────────────────────────────────────"

