# Production Setup Guide - Tenant Resolver Middleware

This document provides step-by-step instructions for setting up the tenant resolver middleware in a production environment. Format this as an agent prompt for automated deployment.

## Agent Prompt Instructions

You are setting up a multi-tenant CMS backend with the following requirements:

- Master database (PostgreSQL) for tenant metadata
- Redis for caching tenant configurations
- Multiple tenant databases (one per club/subdomain)
- NestJS backend with TypeORM

Follow these steps in order, verify each step before proceeding.

## Prerequisites Check

Before starting, verify these are installed and accessible:

- PostgreSQL (version 14+)
- Redis (version 6+)
- Node.js (version 20+)
- pnpm (package manager)

**Commands to verify:**

```bash
psql --version
redis-cli --version
node --version
pnpm --version
```

If any are missing, install them first.

## Step 1: Configure Environment Variables

**Location**: `packages/backend/.env`

**Action**: Create or update `.env` file with production values:

```env
# Master Database Configuration
MASTER_DB_HOST=your-db-host
MASTER_DB_PORT=5432
MASTER_DB_USER=your-db-user
MASTER_DB_PASSWORD=your-secure-password
MASTER_DB_NAME=cms_master

# Redis Configuration
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password-if-set
REDIS_DB=0
REDIS_TTL=3600

# Encryption Secret (IMPORTANT: Use a strong, unique secret!)
ENCRYPTION_SECRET=generate-a-strong-random-secret-here-min-32-chars

# Application
NODE_ENV=production
PORT=3000
```

**Security Notes:**

- Never commit `.env` to version control
- Use strong, randomly generated passwords
- Generate ENCRYPTION_SECRET using: `openssl rand -base64 32`
- Store credentials securely (use secrets manager in production)

**Verification:**

```bash
cd packages/backend
test -f .env && echo "✅ .env exists" || echo "❌ .env missing"
grep -q "MASTER_DB_HOST" .env && echo "✅ Database config present" || echo "❌ Missing config"
grep -q "ENCRYPTION_SECRET" .env && echo "✅ Encryption secret present" || echo "❌ Missing secret"
```

## Step 2: Create Master Database

**Action**: Create the master database that stores tenant metadata.

**SQL Commands:**

```sql
-- Connect to PostgreSQL as superuser
psql -U postgres

-- Create master database
CREATE DATABASE cms_master;

-- Verify creation
\l cms_master

-- Exit psql
\q
```

**Alternative (non-interactive):**

```bash
psql -U postgres -c "CREATE DATABASE cms_master;"
```

**Verification:**

```bash
psql -U postgres -d cms_master -c "SELECT current_database();"
# Should return: cms_master
```

## Step 3: Set Up Master Database Schema

**Action**: Create the clubs table and indexes.

**SQL File Location**: `packages/backend/scripts/setup-master-db.sql`

**Command:**

```bash
cd packages/backend
psql -U your-db-user -h your-db-host -d cms_master -f scripts/setup-master-db.sql
```

**Or run manually:**

```sql
\c cms_master;

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

CREATE INDEX IF NOT EXISTS idx_clubs_subdomain ON clubs(subdomain);
CREATE INDEX IF NOT EXISTS idx_clubs_status ON clubs(status);
```

**Verification:**

```bash
psql -U your-db-user -h your-db-host -d cms_master -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'clubs';"
# Should return: 1
```

## Step 4: Start/Verify Redis

**Action**: Ensure Redis is running and accessible.

**Check if Redis is running:**

```bash
redis-cli -h your-redis-host -p 6379 ping
# Should return: PONG
```

**If Redis is not running:**

**Linux (systemd):**

```bash
sudo systemctl start redis
sudo systemctl enable redis
sudo systemctl status redis
```

**Docker:**

```bash
docker run -d \
  --name redis \
  -p 6379:6379 \
  --restart unless-stopped \
  redis:alpine redis-server --requirepass your-redis-password
```

**Manual start:**

```bash
redis-server --requirepass your-redis-password
```

**Verification:**

```bash
redis-cli -h your-redis-host -p 6379 -a your-redis-password ping
# Should return: PONG
```

## Step 5: Create Tenant Databases

**Action**: Create separate databases for each tenant/club.

**For each tenant, create a database:**

```sql
-- Connect to PostgreSQL
psql -U postgres

-- Create tenant database
CREATE DATABASE tenant_subdomain_db;

-- Grant permissions (adjust as needed)
GRANT ALL PRIVILEGES ON DATABASE tenant_subdomain_db TO your-db-user;

-- Verify
\l tenant_subdomain_db
```

**Example for multiple tenants:**

```sql
CREATE DATABASE club1_db;
CREATE DATABASE club2_db;
CREATE DATABASE club3_db;
```

**Verification:**

```bash
psql -U your-db-user -h your-db-host -c "\l" | grep "club.*_db"
# Should list all tenant databases
```

## Step 6: Encrypt Tenant Database Passwords

**Action**: Encrypt passwords for tenant database credentials before storing in master DB.

**Script Location**: `packages/backend/scripts/encrypt-password.mjs`

**Usage:**

```bash
cd packages/backend

# Set encryption secret (must match ENCRYPTION_SECRET in .env)
export ENCRYPTION_SECRET="your-encryption-secret"

# Encrypt password
node scripts/encrypt-password.mjs "tenant-db-password"

# Copy the encrypted output
```

**Important:**

- Use the SAME ENCRYPTION_SECRET as in `.env`
- Never use plain text passwords in the database
- Store the encrypted value securely

**Example Output:**

```
✅ Encrypted password:
a1b2c3d4e5f6:g7h8i9j0k1:l2m3n4o5p6q7r8s9t0...
```

## Step 7: Insert Tenant Records into Master Database

**Action**: Insert tenant metadata into the `clubs` table.

**For each tenant, run:**

```sql
\c cms_master;

INSERT INTO clubs (
  subdomain,
  name,
  db_host,
  db_port,
  db_name,
  db_user,
  db_password_encrypted,
  connection_pool_size,
  status
) VALUES (
  'tenant-subdomain',
  'Tenant Name',
  'tenant-db-host',
  5432,
  'tenant_subdomain_db',
  'tenant-db-user',
  'encrypted-password-from-step-6',
  10,
  'active'
)
ON CONFLICT (subdomain) DO UPDATE SET
  name = EXCLUDED.name,
  db_password_encrypted = EXCLUDED.db_password_encrypted,
  updated_at = CURRENT_TIMESTAMP;
```

**Example:**

```sql
INSERT INTO clubs (
  subdomain, name, db_host, db_port, db_name, db_user, db_password_encrypted, status
) VALUES (
  'club1',
  'Club 1 Name',
  'localhost',
  5432,
  'club1_db',
  'postgres',
  'a1b2c3d4e5f6:g7h8i9j0k1:l2m3n4o5p6...',
  'active'
);
```

**Verification:**

```bash
psql -U your-db-user -h your-db-host -d cms_master -c "SELECT subdomain, name, db_name, status FROM clubs;"
# Should list all tenants
```

## Step 8: Install Dependencies

**Action**: Install all required npm packages.

**Command:**

```bash
cd packages/backend
pnpm install
```

**Verification:**

```bash
pnpm list @nestjs/typeorm @nestjs/config typeorm pg ioredis
# Should show installed packages
```

## Step 9: Build the Application

**Action**: Compile TypeScript to JavaScript.

**Command:**

```bash
cd packages/backend
pnpm build
```

**Verification:**

```bash
test -d dist && echo "✅ Build successful" || echo "❌ Build failed"
ls -la dist/
# Should show compiled JavaScript files
```

## Step 10: Configure DNS/Subdomain Routing (Production)

**Action**: Configure DNS and reverse proxy for subdomain routing.

**Option A: DNS Configuration**

```
# Add DNS records (example)
club1.yourdomain.com    A    your-server-ip
club2.yourdomain.com    A    your-server-ip
```

**Option B: Reverse Proxy (Nginx)**

```nginx
server {
    listen 80;
    server_name *.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

**Option C: Load Balancer**

- Configure load balancer to forward requests with Host header
- Ensure Host header is preserved in requests

## Step 11: Start the Application

**Action**: Start the NestJS server.

**Development:**

```bash
cd packages/backend
pnpm start:dev
```

**Production (PM2):**

```bash
cd packages/backend
pnpm build
pm2 start dist/main.js --name cms-backend
pm2 save
pm2 startup
```

**Production (systemd):**

```bash
# Create service file: /etc/systemd/system/cms-backend.service
[Unit]
Description=CMS Backend Service
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/packages/backend
ExecStart=/usr/bin/node dist/main.js
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target

# Enable and start
sudo systemctl enable cms-backend
sudo systemctl start cms-backend
sudo systemctl status cms-backend
```

**Docker:**

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install -g pnpm && pnpm install
COPY . .
RUN pnpm build
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

## Step 12: Verify Installation

**Action**: Test the tenant resolver functionality.

### Test 1: Health Check

```bash
curl -H "Host: tenant-subdomain.yourdomain.com" \
     http://your-server:3000/test/health
```

**Expected**: HTTP 200 with tenant info

### Test 2: Tenant Info

```bash
curl -H "Host: tenant-subdomain.yourdomain.com" \
     http://your-server:3000/test/info
```

**Expected**: JSON with tenant context

### Test 3: Database Query

```bash
curl -H "Host: tenant-subdomain.yourdomain.com" \
     http://your-server:3000/test/query
```

**Expected**: JSON with database query results

### Test 4: Connection Metrics

```bash
curl -H "Host: tenant-subdomain.yourdomain.com" \
     http://your-server:3000/test/metrics
```

**Expected**: JSON with connection pool metrics

## Troubleshooting

### Issue: Database Connection Failed

**Check:**

- Database credentials in `.env`
- Database server is running
- Network connectivity to database
- Firewall rules allow connection

**Commands:**

```bash
psql -U your-db-user -h your-db-host -d cms_master -c "SELECT 1;"
```

### Issue: Redis Connection Failed

**Check:**

- Redis server is running
- Redis credentials in `.env`
- Network connectivity to Redis
- Redis authentication

**Commands:**

```bash
redis-cli -h your-redis-host -p 6379 -a your-password ping
```

### Issue: Tenant Not Found (404)

**Check:**

- Subdomain exists in `clubs` table
- Subdomain matches exactly (case-sensitive)
- Tenant status is 'active'

**Commands:**

```sql
SELECT * FROM clubs WHERE subdomain = 'tenant-subdomain';
```

### Issue: Invalid Subdomain (400)

**Check:**

- Subdomain format is valid (alphanumeric, hyphens only)
- No special characters
- Subdomain length (1-63 characters)

### Issue: Cache Not Working

**Check:**

- Redis is accessible
- Redis connection config in `.env`
- Check application logs for cache errors

**Commands:**

```bash
redis-cli -h your-redis-host GET "tenant:subdomain:config"
```

## Security Checklist

- [ ] Strong, unique passwords for all databases
- [ ] ENCRYPTION_SECRET is randomly generated (32+ chars)
- [ ] `.env` file is not committed to version control
- [ ] Database credentials are encrypted in master DB
- [ ] Redis password is set (if using password auth)
- [ ] SSL/TLS enabled for database connections (production)
- [ ] SSL/TLS enabled for Redis (production)
- [ ] Firewall rules restrict database access
- [ ] Regular security updates applied
- [ ] Backup strategy for master database and tenant databases
- [ ] Monitoring and alerting configured

## Monitoring

**Key Metrics to Monitor:**

- Tenant resolution time
- Cache hit/miss rates
- Connection pool usage
- Active connections per tenant
- Error rates (404, 503, etc.)
- Redis memory usage
- Database connection pool exhaustion

**Log Messages to Watch:**

```
Tenant resolved: <subdomain> (<time>ms, cache: hit/miss)
Created new connection pool for tenant: <id>
Failed to initialize database connection
Cache miss for tenant: <subdomain>
```

## Backup Strategy

**Master Database:**

```bash
# Daily backup
pg_dump -U your-user -h your-host cms_master > backup-cms_master-$(date +%Y%m%d).sql
```

**Tenant Databases:**

```bash
# Backup all tenant databases
for db in $(psql -U your-user -h your-host -d cms_master -t -c "SELECT db_name FROM clubs WHERE status='active'"); do
  pg_dump -U your-user -h your-host $db > backup-$db-$(date +%Y%m%d).sql
done
```

**Redis:**

```bash
# Save Redis data
redis-cli -h your-redis-host SAVE
```

## Rollback Procedure

If issues occur:

1. **Stop the application**
2. **Restore master database backup** (if needed)
3. **Restore tenant databases** (if needed)
4. **Clear Redis cache** (if corrupted)
5. **Review logs** for errors
6. **Fix configuration issues**
7. **Restart application**

## Maintenance

**Regular Tasks:**

- Monitor connection pool metrics
- Review cache hit rates
- Check for suspended/inactive tenants
- Update tenant credentials as needed
- Rotate ENCRYPTION_SECRET (requires re-encrypting all passwords)
- Review and clean old logs

**Adding New Tenants:**

1. Create tenant database
2. Encrypt tenant DB password
3. Insert into clubs table
4. Verify tenant can connect
5. Test subdomain routing

---

## Quick Reference Commands

```bash
# Check master DB
psql -U user -h host -d cms_master -c "SELECT COUNT(*) FROM clubs;"

# Check Redis
redis-cli -h host ping

# Encrypt password
cd packages/backend && node scripts/encrypt-password.mjs "password"

# View tenants
psql -U user -h host -d cms_master -c "SELECT subdomain, name, status FROM clubs;"

# Test endpoint
curl -H "Host: subdomain.domain.com" http://server:3000/test/info

# Check application logs
pm2 logs cms-backend
# or
journalctl -u cms-backend -f
```

---

**End of Setup Guide**
