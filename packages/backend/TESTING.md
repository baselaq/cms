# Testing Guide for Tenant Resolver

This guide will help you test the tenant resolver middleware implementation.

## Prerequisites

1. **PostgreSQL** - Running and accessible
2. **Redis** - Running and accessible
3. **Environment variables** - `.env` file configured

## Quick Start

### 1. Set up Environment

Create `.env` file in `packages/backend/`:

```env
MASTER_DB_HOST=localhost
MASTER_DB_PORT=5432
MASTER_DB_USER=postgres
MASTER_DB_PASSWORD=your_password
MASTER_DB_NAME=cms_master

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_TTL=3600

ENCRYPTION_SECRET=test-secret-key-change-in-production
NODE_ENV=development
PORT=3000
```

### 2. Set up Master Database

```bash
# Option A: Use the SQL script
psql -U postgres -f scripts/setup-master-db.sql

# Option B: Run manually
psql -U postgres
CREATE DATABASE cms_master;
\c cms_master
# Then run the CREATE TABLE statement from setup-master-db.sql
```

### 3. Create Test Tenant

```bash
# This will generate SQL with encrypted password
./scripts/setup-test-tenant.sh club1 postgres

# Then run the generated SQL
psql -U postgres -f scripts/insert-test-tenant.sql

# Or manually:
# 1. Encrypt password:
node scripts/encrypt-password.mjs your_password

# 2. Insert into clubs table (use the encrypted value)
```

### 4. Configure Local Hosts (for subdomain testing)

Edit `/etc/hosts` (Linux/Mac) or `C:\Windows\System32\drivers\etc\hosts` (Windows):

```
127.0.0.1 club1.localhost
```

### 5. Start the Server

```bash
cd packages/backend
pnpm start:dev
```

### 6. Run Tests

```bash
# Run the automated test script
./scripts/test-tenant.sh club1

# Or test manually with curl
curl -H "Host: club1.localhost" http://localhost:3000/test/info
```

## Test Endpoints

All test endpoints are under `/test` and require the `TenantResolverGuard`:

### 1. Health Check

```bash
curl -H "Host: club1.localhost" http://localhost:3000/test/health
```

**Expected**: 200 OK with tenant info

### 2. Tenant Info

```bash
curl -H "Host: club1.localhost" http://localhost:3000/test/info
```

**Expected**: 200 OK with full tenant context

### 3. Database Query

```bash
curl -H "Host: club1.localhost" http://localhost:3000/test/query
```

**Expected**: 200 OK with database query results

### 4. Connection Metrics

```bash
curl -H "Host: club1.localhost" http://localhost:3000/test/metrics
```

**Expected**: 200 OK with connection pool metrics

### 5. All Metrics

```bash
curl -H "Host: club1.localhost" http://localhost:3000/test/metrics/all
```

**Expected**: 200 OK with all tenant metrics

## Testing Scenarios

### ✅ Success Cases

1. **Valid subdomain with active tenant**

   ```bash
   curl -H "Host: club1.localhost" http://localhost:3000/test/info
   ```

   - Should return 200
   - Should show tenant context
   - Should log "cache: miss" on first request
   - Should log "cache: hit" on subsequent requests

2. **Database connection**

   ```bash
   curl -H "Host: club1.localhost" http://localhost:3000/test/query
   ```

   - Should execute query on tenant's database
   - Should return database name matching tenant

3. **Connection pooling**
   - Make multiple requests
   - Check metrics endpoint
   - Should show same connection pool being reused

### ❌ Error Cases

1. **Invalid subdomain format**

   ```bash
   curl -H "Host: invalid..subdomain.localhost" http://localhost:3000/test/info
   ```

   - Should return 400 Bad Request

2. **Non-existent tenant**

   ```bash
   curl -H "Host: nonexistent.localhost" http://localhost:3000/test/info
   ```

   - Should return 404 Not Found

3. **Suspended tenant** (update status in DB)
   ```sql
   UPDATE clubs SET status = 'suspended' WHERE subdomain = 'club1';
   ```
   ```bash
   curl -H "Host: club1.localhost" http://localhost:3000/test/info
   ```

   - Should return 503 Service Unavailable

## Verifying Cache

1. **First Request** - Check server logs:

   ```
   Tenant resolved: club1 (Xms, cache: miss)
   ```

2. **Second Request** - Check server logs:

   ```
   Tenant resolved: club1 (Xms, cache: hit)
   ```

3. **Cache Invalidation** - Test by:
   - Waiting for TTL to expire (1 hour default)
   - Or manually clearing Redis

## Monitoring

### Check Connection Metrics

```bash
curl -H "Host: club1.localhost" http://localhost:3000/test/metrics | jq
```

Expected response:

```json
{
  "success": true,
  "tenantId": "...",
  "metrics": {
    "tenantId": "...",
    "activeConnections": 0,
    "poolSize": 10,
    "acquisitionTime": 123,
    "lastAcquired": "2024-...",
    "totalAcquisitions": 1,
    "totalReleases": 0
  }
}
```

### Server Logs

Watch for these log messages:

- `Tenant resolved: <subdomain> (<time>ms, cache: <hit|miss>)`
- `Created new connection pool for tenant: <id>`
- `Reusing existing connection pool for tenant: <id>`
- `Cache hit for tenant: <subdomain>`
- `Cache miss for tenant: <subdomain>`

## Troubleshooting

### Issue: 404 Not Found

- Check that tenant exists in `clubs` table
- Verify subdomain matches exactly
- Check tenant status is 'active'

### Issue: 503 Service Unavailable

- Check tenant status in database
- Verify tenant database exists and is accessible
- Check database credentials are correct
- Verify encryption/decryption is working

### Issue: Cache not working

- Check Redis is running
- Verify Redis connection in logs
- Check REDIS_HOST and REDIS_PORT in .env

### Issue: Connection pool errors

- Check tenant database exists
- Verify database credentials
- Check connection pool size limits
- Review connection metrics

## Manual SQL Testing

### Insert Test Tenant Manually

1. Encrypt password:

```bash
node scripts/encrypt-password.mjs your_password
```

2. Insert into database:

```sql
\c cms_master;

INSERT INTO clubs (subdomain, name, db_host, db_port, db_name, db_user, db_password_encrypted, status)
VALUES (
  'club1',
  'Test Club 1',
  'localhost',
  5432,
  'club1_db',
  'postgres',
  '<encrypted_password_from_step_1>',
  'active'
);
```

3. Create tenant database:

```sql
CREATE DATABASE club1_db;
```

## Next Steps

Once basic testing passes:

1. Test with multiple tenants
2. Test connection pool limits
3. Test Redis fallback (stop Redis)
4. Test error scenarios
5. Load test with multiple concurrent requests
