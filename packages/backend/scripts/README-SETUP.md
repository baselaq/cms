# Database Setup Scripts

Quick reference for setting up tenant databases and creating test users.

## Setup Tenant Tables

Creates the `users` and `user_tokens` tables in tenant databases.

### Setup All Tenants

```bash
cd packages/backend
pnpm setup:tenant-tables
```

This will:

- Query the master database for all active tenants
- Create auth tables in each tenant database
- Verify tables were created successfully

### Setup Specific Tenant

```bash
cd packages/backend
pnpm setup:tenant-tables club1
```

Or using environment variable:

```bash
DB_NAME=club1_db pnpm setup:tenant-tables
```

## Create Test User

Creates a test user in a tenant database with hashed password.

```bash
cd packages/backend
pnpm create:test-user <email> <password> <subdomain> [firstName] [lastName]
```

### Example

```bash
pnpm create:test-user owner@app.com 12345678 club1 Owner User
```

This will:

- Hash the password using bcrypt (same as backend)
- Insert user into the tenant database
- Set status to 'active'
- Verify user was created

## Environment Variables

Scripts use these environment variables (from backend `.env`):

- `MASTER_DB_HOST` - Master database host (default: localhost)
- `MASTER_DB_PORT` - Master database port (default: 5432)
- `MASTER_DB_USER` - Master database user (default: postgres)
- `MASTER_DB_PASSWORD` - Master database password (default: postgres)
- `MASTER_DB_NAME` - Master database name (default: cms_master)
- `ENCRYPTION_SECRET` - Encryption key for tenant passwords

For specific tenant override:

- `DB_NAME` - Tenant database name (e.g., club1_db)
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` - Tenant database credentials

## Troubleshooting

### "relation 'users' does not exist"

Run: `pnpm setup:tenant-tables`

### "Tenant not found"

Make sure the tenant exists in master database with status 'active'

### "Database does not exist"

Create the tenant database first:

```bash
createdb -U postgres club1_db
```

### Connection errors

Check your `.env` file has correct database credentials.
