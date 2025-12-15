# Environment Variables Setup Guide

This guide explains how to set up environment variables for the CMS application based on the latest changes.

## Quick Start

### Frontend (Next.js)

1. **Create `.env.local` file** in `packages/web/`:

   ```bash
   cd packages/web
   cp .env.example .env.local
   ```

2. **Update the values** in `.env.local`:
   ```env
   NEXT_PUBLIC_APP_DOMAIN=cms.test
   NEXT_PUBLIC_FRONTEND_PORT=3001
   NEXT_PUBLIC_BACKEND_PORT=3000
   NEXT_PUBLIC_PROTOCOL=http
   NODE_ENV=development
   ```

### Backend (NestJS)

1. **Create `.env` file** in `packages/backend/`:

   ```bash
   cd packages/backend
   cp .env.example .env
   ```

2. **Update the values** in `.env`:
   ```env
   PORT=3000
   APP_DOMAIN=cms.test
   NODE_ENV=development
   DB_HOST=localhost
   DB_PORT=5432
   DB_USERNAME=postgres
   DB_PASSWORD=postgres
   DB_DATABASE=cms_master
   JWT_SECRET=your-secret-key-change-in-production
   ```

## Environment Variables Reference

### Frontend Variables (`packages/web/.env.local`)

| Variable                       | Description              | Default          | Required |
| ------------------------------ | ------------------------ | ---------------- | -------- |
| `NEXT_PUBLIC_APP_DOMAIN`       | Main application domain  | `cms.test`       | No       |
| `NEXT_PUBLIC_FRONTEND_PORT`    | Frontend port            | `3001`           | No       |
| `NEXT_PUBLIC_BACKEND_PORT`     | Backend API port         | `3000`           | No       |
| `NEXT_PUBLIC_PROTOCOL`         | Protocol (http/https)    | `http`           | No       |
| `NEXT_PUBLIC_API_URL`          | Override API URL         | Auto-constructed | No       |
| `NEXT_PUBLIC_TENANT_SUBDOMAIN` | Default tenant subdomain | Auto-detected    | No       |
| `NODE_ENV`                     | Node environment         | `development`    | No       |

**Note:** All `NEXT_PUBLIC_*` variables are exposed to the browser and must be prefixed with `NEXT_PUBLIC_`.

### Backend Variables (`packages/backend/.env`)

| Variable                  | Description                        | Default       | Required |
| ------------------------- | ---------------------------------- | ------------- | -------- |
| `PORT`                    | Backend server port                | `3000`        | No       |
| `APP_DOMAIN`              | Main application domain (for CORS) | `cms.test`    | No       |
| `NODE_ENV`                | Node environment                   | `development` | No       |
| `DB_HOST`                 | PostgreSQL host                    | `localhost`   | Yes      |
| `DB_PORT`                 | PostgreSQL port                    | `5432`        | Yes      |
| `DB_USERNAME`             | PostgreSQL username                | -             | Yes      |
| `DB_PASSWORD`             | PostgreSQL password                | -             | Yes      |
| `DB_DATABASE`             | Master database name               | `cms_master`  | Yes      |
| `JWT_SECRET`              | JWT secret key                     | -             | Yes      |
| `JWT_EXPIRES_IN`          | JWT expiration time                | `1h`          | No       |
| `JWT_REFRESH_EXPIRES_IN`  | Refresh token expiration           | `7d`          | No       |
| `ONBOARDING_TOKEN_TTL_MS` | Onboarding token TTL               | `3600000`     | No       |

## Development Setup

For local development with `cms.test`:

### 1. Update Frontend `.env.local`:

```env
NEXT_PUBLIC_APP_DOMAIN=cms.test
NEXT_PUBLIC_FRONTEND_PORT=3001
NEXT_PUBLIC_BACKEND_PORT=3000
NEXT_PUBLIC_PROTOCOL=http
NODE_ENV=development
```

### 2. Update Backend `.env`:

```env
PORT=3000
APP_DOMAIN=cms.test
NODE_ENV=development
# ... rest of your database and JWT config
```

### 3. Update `/etc/hosts`:

Add these entries (see `HOSTS_SETUP.md` for details):

```
127.0.0.1 cms.test
```

## Production Setup

For production deployment:

### Frontend `.env.local`:

```env
NEXT_PUBLIC_APP_DOMAIN=yourdomain.com
NEXT_PUBLIC_FRONTEND_PORT=
NEXT_PUBLIC_BACKEND_PORT=
NEXT_PUBLIC_PROTOCOL=https
NODE_ENV=production
```

**Note:** In production, ports are usually handled by a reverse proxy (nginx, etc.), so you may leave port variables empty or omit them.

### Backend `.env`:

```env
PORT=3000
APP_DOMAIN=yourdomain.com
NODE_ENV=production
# ... production database and JWT config
```

## How Configuration Works

The application uses a centralized configuration system:

1. **Frontend** (`packages/web/lib/app-config.ts`):

   - Reads `NEXT_PUBLIC_*` environment variables
   - Provides helper functions: `getAppDomain()`, `getFrontendUrl()`, `getBackendUrl()`, `getClubUrl()`
   - Automatically constructs URLs based on domain and port settings

2. **Backend** (`packages/backend/src/main.ts`):

   - Reads `APP_DOMAIN` for CORS configuration
   - Uses `PORT` for server binding

3. **Middleware** (`packages/web/middleware.ts`):
   - Uses `NEXT_PUBLIC_APP_DOMAIN` to detect main domain vs subdomains
   - Determines which routes are public vs protected

## Troubleshooting

### Issue: Landing page redirects to login

- **Solution:** Ensure `NEXT_PUBLIC_APP_DOMAIN` matches your actual domain in the browser
- Check that `/etc/hosts` is configured correctly

### Issue: CORS errors

- **Solution:** Ensure `APP_DOMAIN` in backend matches `NEXT_PUBLIC_APP_DOMAIN` in frontend
- Check backend CORS configuration in `main.ts`

### Issue: Wrong URLs being generated

- **Solution:** Verify all `NEXT_PUBLIC_*` variables are set correctly
- Check browser console for configuration logs (in development mode)

## Security Notes

1. **Never commit `.env` or `.env.local` files** to version control
2. **Use strong JWT secrets** in production
3. **Use HTTPS** in production (`NEXT_PUBLIC_PROTOCOL=https`)
4. **Restrict CORS** in production to your actual domain
