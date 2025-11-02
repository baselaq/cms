# Setup Checklist

## ✅ Completed

- [x] Dependencies installed (TypeORM, Redis, etc.)
- [x] All tenant resolver code implemented
- [x] Test controller and scripts created
- [x] Environment file template created

## ⏳ Remaining Steps

### 1. Configure Environment Variables

**Status**: ✅ `.env` file has been created

**Action Required**:

- Review `.env` file and update with your actual credentials:
  ```bash
  cd packages/backend
  # Edit .env and update:
  # - MASTER_DB_PASSWORD (your PostgreSQL password)
  # - ENCRYPTION_SECRET (use a strong secret in production)
  ```

### 2. Set up Master Database

**Status**: ❌ Not done yet

**Steps**:

```bash
# 1. Create master database
psql -U postgres
CREATE DATABASE cms_master;
\q

# 2. Run setup script
psql -U postgres -d cms_master -f scripts/setup-master-db.sql

# 3. Verify
psql -U postgres -d cms_master -c "SELECT COUNT(*) FROM clubs;"
```

**Expected Output**: Should show `clubs_count | 0` (no clubs yet)

### 3. Start Redis Server

**Status**: ❌ Redis not running

**Steps**:

**MacOS (Homebrew)**:

```bash
brew services start redis
# Or run manually: redis-server
```

**Linux (systemd)**:

```bash
sudo systemctl start redis
# Or: sudo service redis start
```

**Docker**:

```bash
docker run -d -p 6379:6379 redis:alpine
```

**Verify Redis is running**:

```bash
redis-cli ping
# Should return: PONG
```

### 4. Create Test Tenant

**Status**: ❌ Not done yet

**Steps**:

```bash
cd packages/backend

# 1. Create tenant database
psql -U postgres
CREATE DATABASE club1_db;
\q

# 2. Encrypt password
node scripts/encrypt-password.mjs postgres
# Copy the encrypted output

# 3. Insert into clubs table
psql -U postgres -d cms_master
```

Then run this SQL (replace `<encrypted_password>` with output from step 2):

```sql
INSERT INTO clubs (subdomain, name, db_host, db_port, db_name, db_user, db_password_encrypted, status)
VALUES (
  'club1',
  'Test Club 1',
  'localhost',
  5432,
  'club1_db',
  'postgres',
  '<encrypted_password>',
  'active'
);
```

**Or use the automated script**:

```bash
./scripts/setup-test-tenant.sh club1 postgres
# Then run the generated SQL
```

### 5. Configure Local Hosts (for subdomain testing)

**Status**: ❌ Not done yet

**Steps**:

**MacOS/Linux**:

```bash
sudo nano /etc/hosts
# Add: 127.0.0.1 club1.localhost
```

**Windows**:

```powershell
# Run as Administrator
notepad C:\Windows\System32\drivers\etc\hosts
# Add: 127.0.0.1 club1.localhost
```

### 6. Start the Application

**Status**: ❌ Not started yet

**Steps**:

```bash
cd packages/backend
pnpm start:dev
```

**Expected Output**:

```
[Nest] INFO  [TenantModule] TenantModule initialized
[Nest] INFO  [ConnectionManagerService] ConnectionManagerService initialized
Application is running on: http://localhost:3000
```

### 7. Run Tests

**Status**: ❌ Not tested yet

**Steps**:

```bash
# In another terminal
cd packages/backend
./scripts/test-tenant.sh club1
```

**Or test manually**:

```bash
curl -H "Host: club1.localhost" http://localhost:3000/test/info | jq
```

## Quick Verification Commands

Check everything is ready:

```bash
# Check .env exists
test -f packages/backend/.env && echo "✅ .env exists" || echo "❌ .env missing"

# Check Redis
redis-cli ping && echo "✅ Redis running" || echo "❌ Redis not running"

# Check PostgreSQL
psql -U postgres -d cms_master -c "SELECT 1;" && echo "✅ DB accessible" || echo "❌ DB not accessible"

# Check tenant exists
psql -U postgres -d cms_master -c "SELECT subdomain FROM clubs;" && echo "✅ Tenants configured" || echo "❌ No tenants"
```

## Troubleshooting

### Redis Connection Issues

- Verify Redis is running: `redis-cli ping`
- Check port: `lsof -i :6379`
- Check Redis config: `redis-cli CONFIG GET port`

### Database Connection Issues

- Verify PostgreSQL is running
- Check credentials in `.env`
- Test connection: `psql -U postgres -d cms_master`

### Subdomain Not Resolving

- Check hosts file is configured correctly
- Verify subdomain format: `club1.localhost` (no `www`)
- Try: `curl -H "Host: club1.localhost" http://localhost:3000/test/info`
