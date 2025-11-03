#!/bin/bash

# Setup script to create auth tables in tenant database
# Usage: ./scripts/setup-tenant-tables.sh [database_name] [db_user] [db_password]

DB_NAME="${1:-club1_db}"
DB_USER="${2:-postgres}"
DB_PASSWORD="${3:-postgres}"
DB_HOST="${4:-localhost}"
DB_PORT="${5:-5432}"

echo "🔧 Setting up auth tables in tenant database..."
echo "Database: ${DB_NAME}"
echo "Host: ${DB_HOST}:${DB_PORT}"
echo ""

# Set PGPASSWORD environment variable
export PGPASSWORD="${DB_PASSWORD}"

# Run the SQL script
echo "📝 Creating users and user_tokens tables..."
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -f scripts/setup-tenant-auth-tables.sql

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Auth tables created successfully!"
  echo ""
  echo "💡 Next steps:"
  echo "   1. Create a test user using the password hashing script:"
  echo "      node scripts/encrypt-password.mjs"
  echo "   2. Or use the example in setup-tenant-auth-tables.sql"
else
  echo ""
  echo "❌ Failed to create tables. Please check your database connection."
  exit 1
fi

# Unset PGPASSWORD
unset PGPASSWORD

