import {
  Injectable,
  CanActivate,
  ExecutionContext,
  NotFoundException,
  ServiceUnavailableException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { TenantMetadataService } from './tenant-metadata.service';
import { ConnectionManagerService } from './connection-manager.service';
import { TenantCacheService } from './tenant-cache.service';
import { ITenantContext } from './tenant.context';
import { RoleSeedService } from '../auth/services/role-seed.service';

@Injectable()
export class TenantResolverGuard implements CanActivate {
  private readonly logger = new Logger(TenantResolverGuard.name);
  private readonly seedingChecked = new Set<string>(); // Track which tenants we've checked for seeding

  constructor(
    private readonly tenantMetadataService: TenantMetadataService,
    private readonly connectionManager: ConnectionManagerService,
    private readonly cacheService: TenantCacheService,
    private readonly roleSeedService: RoleSeedService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const startTime = Date.now();

    try {
      // Extract subdomain from hostname or headers
      const subdomain = this.extractSubdomain(
        request.hostname,
        request.headers as Record<string, string | string[] | undefined>,
      );

      if (!subdomain) {
        throw new BadRequestException(
          'Invalid subdomain. Please access the application via a valid subdomain.',
        );
      }

      // Validate subdomain format (prevent injection)
      if (!this.isValidSubdomain(subdomain)) {
        throw new BadRequestException('Invalid subdomain format');
      }

      this.logger.debug(`Resolving tenant for subdomain: ${subdomain}`);

      // Try cache first
      let dbConfig = await this.cacheService.get(subdomain);

      if (!dbConfig) {
        // Cache miss - lookup in master database
        const metadata =
          await this.tenantMetadataService.findBySubdomain(subdomain);

        if (!metadata) {
          throw new NotFoundException(
            `Club not found for subdomain: ${subdomain}`,
          );
        }

        // Check if tenant is active
        if (metadata.status !== 'active') {
          throw new ServiceUnavailableException(
            `Club account is ${metadata.status}`,
          );
        }

        // Get decrypted DB config
        dbConfig = this.tenantMetadataService.getDbConfig(metadata);

        // Cache the config
        await this.cacheService.set(subdomain, dbConfig);
      }

      // Get or create connection pool
      const metadata =
        await this.tenantMetadataService.findBySubdomain(subdomain);
      if (!metadata) {
        throw new NotFoundException(
          `Club metadata not found for subdomain: ${subdomain}`,
        );
      }

      const dataSource = await this.connectionManager.getOrCreatePool(
        metadata.id,
        dbConfig,
      );

      // Create tenant context
      const tenantContext: ITenantContext = {
        tenantId: metadata.id,
        subdomain: metadata.subdomain,
        dbConfig,
        dataSource,
        metadata,
      };

      // Auto-seed roles and permissions if not already seeded
      // Only check once per tenant to avoid unnecessary DB queries
      if (!this.seedingChecked.has(metadata.id)) {
        this.seedingChecked.add(metadata.id);
        // This runs asynchronously in the background to not block the request
        this.roleSeedService.seedIfNeeded(tenantContext).catch((error) => {
          this.logger.error(
            `Failed to auto-seed roles for tenant ${metadata.id}:`,
            error,
          );
          // Remove from checked set on error so we can retry
          this.seedingChecked.delete(metadata.id);
        });
      }

      // Attach tenant context to request
      request.tenantContext = tenantContext;

      const duration = Date.now() - startTime;
      this.logger.log(
        `Tenant resolved: ${subdomain} (${duration}ms, cache: ${dbConfig ? 'hit' : 'miss'})`,
      );

      return true;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to resolve tenant (${duration}ms): ${errorMessage}`,
      );

      // Re-throw HTTP exceptions
      if (
        error instanceof NotFoundException ||
        error instanceof ServiceUnavailableException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      // Wrap other errors
      throw new ServiceUnavailableException(
        'Failed to initialize tenant connection. Please try again later.',
      );
    }
  }

  /**
   * Extract subdomain from hostname or headers
   * Handles: subdomain.example.com, subdomain.localhost:3000, etc.
   * Also checks X-Tenant-Subdomain header for server-to-server requests
   */
  private extractSubdomain(
    hostname: string,
    headers?: Record<string, string | string[] | undefined>,
  ): string | null {
    // Check for subdomain in header first (for server-to-server requests and localhost)
    if (headers) {
      // Express normalizes headers to lowercase, so check both formats
      const headerSubdomain =
        headers['x-tenant-subdomain'] || headers['X-Tenant-Subdomain'];
      if (headerSubdomain) {
        const subdomain =
          typeof headerSubdomain === 'string'
            ? headerSubdomain.trim()
            : Array.isArray(headerSubdomain)
              ? headerSubdomain[0]?.trim()
              : null;
        if (subdomain && this.isValidSubdomain(subdomain)) {
          this.logger.debug(
            `Using subdomain from X-Tenant-Subdomain header: ${subdomain}`,
          );
          return subdomain;
        } else if (subdomain) {
          this.logger.warn(`Invalid subdomain in header: ${subdomain}`);
        }
      } else if (process.env.NODE_ENV === 'development') {
        this.logger.debug(
          `No X-Tenant-Subdomain header found. Available headers: ${Object.keys(headers).join(', ')}`,
        );
        this.logger.debug(
          `Header values: ${JSON.stringify(
            Object.entries(headers)
              .filter(
                ([key]) =>
                  key.toLowerCase().includes('tenant') ||
                  key.toLowerCase().includes('subdomain'),
              )
              .reduce(
                (acc, [key, value]) => {
                  acc[key] = value;
                  return acc;
                },
                {} as Record<string, unknown>,
              ),
          )}`,
        );
      }
    }

    // Remove port if present
    const host = hostname.split(':')[0];

    // Handle localhost in development
    if (host === 'localhost' || host === '127.0.0.1') {
      // In development, require header for localhost
      if (process.env.NODE_ENV === 'development') {
        this.logger.warn(
          `Accessing via ${hostname} without subdomain. Please use subdomain.localhost or provide X-Tenant-Subdomain header.`,
        );
      }
      return null;
    }

    const parts = host.split('.');

    // subdomain.example.com -> subdomain
    // www.subdomain.example.com -> subdomain (skip www)
    if (parts.length >= 3) {
      // Skip 'www' if present
      const subdomainIndex = parts[0] === 'www' ? 1 : 0;
      return parts[subdomainIndex];
    }

    // For development: subdomain.localhost
    if (parts.length === 2 && parts[1] === 'localhost') {
      return parts[0];
    }

    return null;
  }

  /**
   * Validate subdomain format
   */
  private isValidSubdomain(subdomain: string): boolean {
    // Subdomain must:
    // - Be 1-63 characters
    // - Start and end with alphanumeric
    // - Contain only alphanumeric and hyphens
    // - Not have consecutive hyphens
    const subdomainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i;
    return (
      subdomain.length >= 1 &&
      subdomain.length <= 63 &&
      subdomainRegex.test(subdomain)
    );
  }
}
