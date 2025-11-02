import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import type { ITenantDbConfig } from './tenant.context';

const CACHE_PREFIX = 'tenant:';
const DEFAULT_TTL = 3600; // 1 hour

@Injectable()
export class TenantCacheService {
  private readonly logger = new Logger(TenantCacheService.name);

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * Get tenant config from cache
   */
  async get(subdomain: string): Promise<ITenantDbConfig | null> {
    try {
      const key = this.getCacheKey(subdomain);
      const cached = await this.cacheManager.get<ITenantDbConfig>(key);

      if (cached) {
        this.logger.debug(`Cache hit for tenant: ${subdomain}`);
        return cached;
      }

      this.logger.debug(`Cache miss for tenant: ${subdomain}`);
      return null;
    } catch (error) {
      this.logger.error(`Error getting cache for tenant ${subdomain}:`, error);
      return null; // Fail gracefully, fallback to DB
    }
  }

  /**
   * Set tenant config in cache
   */
  async set(
    subdomain: string,
    config: ITenantDbConfig,
    ttl?: number,
  ): Promise<void> {
    try {
      const key = this.getCacheKey(subdomain);
      await this.cacheManager.set(key, config, ttl || DEFAULT_TTL);
      this.logger.debug(`Cached config for tenant: ${subdomain}`);
    } catch (error) {
      this.logger.error(`Error setting cache for tenant ${subdomain}:`, error);
      // Don't throw, caching is not critical
    }
  }

  /**
   * Invalidate cache for a tenant
   */
  async invalidate(subdomain: string): Promise<void> {
    try {
      const key = this.getCacheKey(subdomain);
      await this.cacheManager.del(key);
      this.logger.debug(`Invalidated cache for tenant: ${subdomain}`);
    } catch (error) {
      this.logger.error(
        `Error invalidating cache for tenant ${subdomain}:`,
        error,
      );
    }
  }

  /**
   * Clear all tenant caches
   */
  async clearAll(): Promise<void> {
    try {
      // Note: cache-manager v5+ may use different method
      // If reset() is not available, iterate and delete keys
      const cacheManagerAny = this.cacheManager as {
        reset?: () => Promise<void>;
      };
      if (typeof cacheManagerAny.reset === 'function') {
        await cacheManagerAny.reset();
      }
      this.logger.log('Cleared all tenant caches');
    } catch (error) {
      this.logger.error('Error clearing all caches:', error);
    }
  }

  private getCacheKey(subdomain: string): string {
    return `${CACHE_PREFIX}${subdomain}:config`;
  }
}
