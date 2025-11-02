import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

/**
 * Redis-based token blacklist for instant revocation
 */
@Injectable()
export class TokenBlacklistService {
  private readonly logger = new Logger(TokenBlacklistService.name);
  private readonly PREFIX = 'blacklist:';

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * Add token to blacklist
   * @param token The token to blacklist
   * @param expiresIn Expiry time in seconds (default: 7 days)
   */
  async addToBlacklist(
    token: string,
    expiresIn: number = 604800,
  ): Promise<void> {
    try {
      const key = `${this.PREFIX}${token}`;
      await this.cacheManager.set(key, '1', expiresIn * 1000); // Convert to milliseconds
      this.logger.debug(`Token blacklisted: ${key.substring(0, 20)}...`);
    } catch (error) {
      this.logger.error('Failed to add token to blacklist', error);
      throw error;
    }
  }

  /**
   * Check if token is blacklisted
   */
  async isBlacklisted(token: string): Promise<boolean> {
    try {
      const key = `${this.PREFIX}${token}`;
      const value = await this.cacheManager.get<string>(key);
      return value === '1';
    } catch (error) {
      this.logger.error('Failed to check token blacklist', error);
      // On Redis failure, assume not blacklisted to allow fallback
      return false;
    }
  }

  /**
   * Remove token from blacklist
   */
  async removeFromBlacklist(token: string): Promise<void> {
    try {
      const key = `${this.PREFIX}${token}`;
      await this.cacheManager.del(key);
      this.logger.debug(
        `Token removed from blacklist: ${key.substring(0, 20)}...`,
      );
    } catch (error) {
      this.logger.error('Failed to remove token from blacklist', error);
    }
  }

  /**
   * Blacklist multiple tokens (e.g., all tokens for a user)
   */
  async addMultipleToBlacklist(
    tokens: string[],
    expiresIn: number = 604800,
  ): Promise<void> {
    try {
      await Promise.all(
        tokens.map((token) => this.addToBlacklist(token, expiresIn)),
      );
      this.logger.debug(`Blacklisted ${tokens.length} tokens`);
    } catch (error) {
      this.logger.error('Failed to blacklist multiple tokens', error);
      throw error;
    }
  }
}
