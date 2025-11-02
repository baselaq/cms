# Authentication Service

This document describes the authentication and authorization implementation for the CMS backend.

## Overview

The authentication system provides JWT-based authentication with:
- Per-tenant JWT secrets for enhanced security
- Access and refresh token pairs
- Redis-based token blacklist for instant revocation
- Tenant-aware authentication (all auth is scoped to tenant databases)
- Hashed refresh token storage in database

## Architecture

### Components

1. **AuthModule** - Main authentication module
2. **AuthService** - Handles login, refresh, and logout logic
3. **AuthJwtService** - Manages JWT generation and verification with per-tenant secrets
4. **TokenBlacklistService** - Redis-based blacklist for instant token revocation
5. **JwtStrategy** - Passport strategy for JWT authentication
6. **JwtAuthGuard** - Guard to protect routes requiring authentication
7. **TenantResolverGuard** - Ensures tenant context is resolved (applied to auth endpoints)

### Flow

#### Login Flow
```
POST /auth/login
  ├─ TenantResolverGuard extracts tenant from subdomain
  ├─ Validate credentials against tenant DB users table
  ├─ Check user status (must be 'active')
  ├─ Generate JWT access & refresh tokens (per-tenant secret)
  ├─ Hash and store refresh token in user_tokens table
  ├─ Update last_login_at
  └─ Return tokens + user info
```

#### Token Refresh Flow
```
POST /auth/refresh
  ├─ TenantResolverGuard extracts tenant from subdomain
  ├─ Check token blacklist in Redis
  ├─ Verify refresh token (per-tenant secret)
  ├─ Validate against stored hash in database
  ├─ Generate new token pair
  ├─ Update stored refresh token
  └─ Return new tokens + user info
```

#### Logout Flow
```
POST /auth/logout
  ├─ TenantResolverGuard extracts tenant from subdomain
  ├─ Verify refresh token
  ├─ Mark token as revoked in database
  ├─ Add to Redis blacklist
  └─ Return success
```

## Setup

### 1. Environment Variables

Add to `.env`:

```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_ACCESS_EXPIRY=900        # 15 minutes
JWT_REFRESH_EXPIRY=604800    # 7 days

# Redis (for token blacklist)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_TTL=3600
```

### 2. Database Setup

Run the migration script in each tenant database:

```bash
psql -U postgres -d club1_db -f scripts/setup-tenant-auth-tables.sql
```

This creates:
- `users` table with email, password (hashed), status, etc.
- `user_tokens` table for storing refresh tokens

### 3. Create Test User

```bash
# Use bcrypt to hash password (requires Node.js)
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('admin123', 10).then(h => console.log(h));"
```

Then insert in tenant database:
```sql
INSERT INTO users (email, password, first_name, last_name, status)
VALUES (
  'admin@example.com',
  '$2b$10$YourHashedPasswordHere',
  'Admin',
  'User',
  'active'
);
```

## API Endpoints

All endpoints require `TenantResolverGuard` (subdomain-based tenant resolution).

### POST /auth/login

Authenticate user and get tokens.

**Request:**
```json
{
  "email": "admin@example.com",
  "password": "admin123"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900,
  "user": {
    "id": "uuid",
    "email": "admin@example.com",
    "firstName": "Admin",
    "lastName": "User"
  }
}
```

**Errors:**
- `401 Unauthorized` - Invalid credentials or inactive account
- `404 Not Found` - Tenant not found

### POST /auth/refresh

Get new access token using refresh token.

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
Same as `/auth/login`

**Errors:**
- `401 Unauthorized` - Invalid/expired/blacklisted token

### POST /auth/logout

Revoke refresh token.

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

## Using Authentication

### Protecting Routes

Use `JwtAuthGuard` to protect routes:

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { CurrentUser } from './auth/decorators/current-user.decorator';

@Controller('protected')
@UseGuards(TenantResolverGuard, JwtAuthGuard)
export class ProtectedController {
  @Get('profile')
  getProfile(@CurrentUser() user: any) {
    return {
      userId: user.userId,
      email: user.email,
      tenantId: user.tenantId,
    };
  }
}
```

### Current User Decorator

Access authenticated user info:

```typescript
@Get('me')
@UseGuards(JwtAuthGuard)
getMe(@CurrentUser() user: any) {
  // user.userId, user.email, user.tenantId, user.subdomain
  return user;
}
```

## Security Features

### Per-Tenant JWT Secrets

Each tenant gets a unique JWT secret based on:
- Master `JWT_SECRET` from environment
- Tenant subdomain
- Tenant ID

This ensures tokens from one tenant cannot be used on another.

### Token Blacklist

Redis stores blacklisted tokens for instant revocation:
- Tokens are automatically removed when TTL expires
- Fast lookup for token validation
- Survives server restarts (if Redis persists)

### Refresh Token Storage

Refresh tokens are:
- Hashed with bcrypt before storage
- Stored with expiry in `user_tokens` table
- Can be revoked per-user or globally
- Includes device/IP tracking

### Password Security

User passwords are:
- Hashed with bcrypt (10 rounds)
- Never returned in API responses
- Validated on every login

## Advanced Usage

### Revoke All User Tokens

Force logout from all devices:

```typescript
await authService.revokeAllUserTokens(userId);
```

### Check Token Blacklist

```typescript
const isBlacklisted = await tokenBlacklistService.isBlacklisted(token);
```

### Generate Tokens Manually

```typescript
const tokens = authJwtService.generateTokens(
  userId,
  email,
  tenantContext,
);
```

## Testing

Example with curl:

```bash
# Login
curl -X POST http://club1.localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'

# Refresh token
curl -X POST http://club1.localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"your-refresh-token-here"}'

# Logout
curl -X POST http://club1.localhost:3000/auth/logout \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"your-refresh-token-here"}'

# Use access token
curl -X GET http://club1.localhost:3000/protected/profile \
  -H "Authorization: Bearer your-access-token-here"
```

## Database Schema

### users

| Column        | Type           | Description                    |
|---------------|----------------|--------------------------------|
| id            | UUID           | Primary key                    |
| email         | VARCHAR(255)   | Unique email                   |
| password      | VARCHAR(255)   | Bcrypt hash                    |
| first_name    | VARCHAR(255)   | Optional                       |
| last_name     | VARCHAR(255)   | Optional                       |
| status        | VARCHAR(20)    | active/inactive/suspended      |
| last_login_at | TIMESTAMP      | Last successful login          |
| created_at    | TIMESTAMP      | Account creation time          |
| updated_at    | TIMESTAMP      | Last update time               |

### user_tokens

| Column     | Type        | Description                      |
|------------|-------------|----------------------------------|
| id         | UUID        | Primary key                      |
| user_id    | UUID        | Foreign key to users             |
| token      | TEXT        | Hashed refresh token             |
| expires_at | TIMESTAMP   | Token expiry                     |
| device     | VARCHAR(255)| Optional device info             |
| ip_address | VARCHAR(255)| Optional IP address              |
| revoked_at | TIMESTAMP   | Revocation time (null if active) |
| created_at | TIMESTAMP   | Token creation time              |
| updated_at | TIMESTAMP   | Last update time                 |

## Future Enhancements

- [ ] Password reset flow
- [ ] Email verification
- [ ] Two-factor authentication
- [ ] Token rotation strategy
- [ ] Rate limiting on auth endpoints
- [ ] Account lockout after failed attempts
- [ ] Session management UI

