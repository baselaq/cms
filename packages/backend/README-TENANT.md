# Tenant Resolver Middleware

This document describes the multi-tenant architecture implementation for the CMS backend.

## Overview

The system implements a tenant-aware architecture where each club (tenant) has its own database. The tenant is resolved from the subdomain in the request hostname.

## Architecture

### Components

1. **TenantResolverGuard** - Extracts subdomain and resolves tenant
2. **TenantMetadataService** - Queries master database for club metadata
3. **TenantCacheService** - Caches tenant DB credentials in Redis
4. **ConnectionManagerService** - Manages pooled DataSource connections per tenant
5. **TenantContextService** - Provides access to tenant context
6. **TenantContext Decorators** - Easy access to tenant info in controllers

### Flow

```
Request → TenantResolverGuard
  ├─ Extract subdomain from req.hostname
  ├─ Check Redis cache for tenant config
  ├─ If miss: Query master_db.clubs table
  ├─ Cache tenant config in Redis (1 hour TTL)
  ├─ Get/Create pooled DataSource via ConnectionManager
  └─ Store tenantContext in ExecutionContext (request object)
     ↓
Request Handler (inject @TenantContext())
  └─ Access tenant-specific DataSource
```

## Setup

### 1. Environment Variables

Create a `.env` file:

```env
# Master Database
MASTER_DB_HOST=localhost
MASTER_DB_PORT=5432
MASTER_DB_USER=postgres
MASTER_DB_PASSWORD=postgres
MASTER_DB_NAME=cms_master

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_TTL=3600

# Encryption (for encrypting tenant DB passwords in master DB)
ENCRYPTION_SECRET=your-secret-key-change-in-production

# Node Environment
NODE_ENV=development
```

### 2. Master Database Setup

Run the SQL script to create the master database and clubs table:

```sql
CREATE DATABASE cms_master;

\c cms_master;

CREATE TABLE clubs (
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

CREATE INDEX idx_clubs_subdomain ON clubs(subdomain);
CREATE INDEX idx_clubs_status ON clubs(status);
```

### 3. Usage

#### Basic Usage with Decorator

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { TenantResolverGuard } from './tenant/tenant-resolver.guard';
import { TenantContext } from './tenant/tenant-context.decorator';
import { ITenantContext } from './tenant/tenant.context';

@Controller('api')
@UseGuards(TenantResolverGuard)
export class MyController {
  @Get('data')
  async getData(@TenantContext() context: ITenantContext) {
    // Access tenant-specific database
    const result = await context.dataSource.query('SELECT * FROM my_table');
    return result;
  }
}
```

#### Using Individual Decorators

```typescript
@Get('info')
getInfo(
  @TenantId() tenantId: string,
  @TenantSubdomain() subdomain: string,
) {
  return { tenantId, subdomain };
}
```

#### Using TenantContextService

```typescript
import { TenantContextService } from './tenant/tenant-context.service';

@Injectable()
export class MyService {
  constructor(
    private readonly tenantContext: TenantContextService,
    @Inject(REQUEST) private readonly request: Request,
  ) {}

  async doSomething() {
    const context = this.tenantContext.getTenantContext(this.request);
    const dataSource = context.dataSource;
    // Use dataSource...
  }
}
```

## Features

### ✅ Implemented

- [x] Subdomain extraction from hostname
- [x] Master database lookup
- [x] Redis caching with TTL
- [x] Connection pooling per tenant (singleton pattern)
- [x] Tenant context injection via ExecutionContext
- [x] Decorators for easy access (@TenantContext, @TenantId, @TenantSubdomain)
- [x] Error handling (404, 503, etc.)
- [x] Subdomain validation (prevent injection)
- [x] Connection metrics and logging
- [x] Graceful shutdown of connection pools

### 📊 Monitoring

Connection metrics are tracked per tenant:

- Active connections
- Pool size
- Acquisition time
- Total acquisitions/releases
- Last acquisition time

Access metrics via:

```typescript
const metrics = connectionManager.getMetrics(tenantId);
const allMetrics = connectionManager.getAllMetrics();
```

## Security Considerations

1. **Subdomain Validation**: Validates format to prevent injection
2. **Encrypted Passwords**: Tenant DB passwords are encrypted in master database
3. **Connection Pool Limits**: Prevents connection exhaustion
4. **Status Checking**: Only active tenants can access their databases

## Error Handling

- `400 Bad Request`: Invalid subdomain format
- `404 Not Found`: Club not found for subdomain
- `503 Service Unavailable`:
  - Club account is suspended/inactive
  - Database connection failure
  - Redis unavailable (falls back to DB)

## Development Notes

### Localhost Development

For local development, you can:

1. Use hosts file: `127.0.0.1 club1.localhost`
2. Access via: `http://club1.localhost:3000`
3. Or use a header-based approach (modify guard for dev mode)

### Testing

Each tenant's database should be created separately. The system will automatically create connection pools as needed.

## Future Enhancements

- [ ] Tenant-specific rate limiting
- [ ] Database migration management per tenant
- [ ] Tenant health checks
- [ ] Prometheus metrics export
- [ ] Support for custom domains (not just subdomains)
