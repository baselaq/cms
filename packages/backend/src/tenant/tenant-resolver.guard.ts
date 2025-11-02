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

@Injectable()
export class TenantResolverGuard implements CanActivate {
  private readonly logger = new Logger(TenantResolverGuard.name);

  constructor(
    private readonly tenantMetadataService: TenantMetadataService,
    private readonly connectionManager: ConnectionManagerService,
    private readonly cacheService: TenantCacheService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const startTime = Date.now();

    try {
      // Extract subdomain from hostname
      const subdomain = this.extractSubdomain(request.hostname);

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
   * Extract subdomain from hostname
   * Handles: subdomain.example.com, subdomain.localhost:3000, etc.
   */
  private extractSubdomain(hostname: string): string | null {
    // Remove port if present
    const host = hostname.split(':')[0];

    // Handle localhost in development
    if (host === 'localhost' || host === '127.0.0.1') {
      // In development, could use a header or query param
      // For now, return null to require proper setup
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
