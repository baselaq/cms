import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { DataSource, DataSourceOptions } from 'typeorm';
import { ITenantDbConfig, IConnectionMetrics } from './tenant.context';
import {
  UserEntity,
  UserTokenEntity,
  RoleEntity,
  PermissionEntity,
  UserRoleEntity,
  RolePermissionEntity,
  ClubSettingEntity,
  ClubPlanEntity,
  TeamEntity,
  ClubInviteEntity,
} from '../database/tenant/entities';

@Injectable()
export class ConnectionManagerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ConnectionManagerService.name);
  private readonly connectionPools = new Map<string, DataSource>();
  private readonly metrics = new Map<string, IConnectionMetrics>();

  onModuleInit() {
    this.logger.log('ConnectionManagerService initialized');
  }

  async onModuleDestroy() {
    this.logger.log('Closing all connection pools...');
    await this.closeAllPools();
  }

  /**
   * Get or create a pooled DataSource for a tenant
   */
  async getOrCreatePool(
    tenantId: string,
    config: ITenantDbConfig,
  ): Promise<DataSource> {
    const startTime = Date.now();

    // Check if pool already exists
    if (this.connectionPools.has(tenantId)) {
      const dataSource = this.connectionPools.get(tenantId)!;
      if (dataSource.isInitialized) {
        this.updateMetrics(tenantId, startTime, 'acquire', true);
        this.logger.debug(
          `Reusing existing connection pool for tenant: ${tenantId}`,
        );
        return dataSource;
      } else {
        // Pool exists but not initialized, remove it
        this.connectionPools.delete(tenantId);
      }
    }

    // Create new connection pool
    try {
      const dataSourceOptions: DataSourceOptions = {
        type: 'postgres',
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password,
        database: config.database,
        poolSize: config.poolSize || 10,
        synchronize: false,
        logging: process.env.NODE_ENV === 'development',
        entities: [
          UserEntity,
          UserTokenEntity,
          RoleEntity,
          PermissionEntity,
          UserRoleEntity,
          RolePermissionEntity,
          ClubSettingEntity,
          ClubPlanEntity,
          TeamEntity,
          ClubInviteEntity,
        ],
      };

      const dataSource = new DataSource(dataSourceOptions);
      await dataSource.initialize();

      this.connectionPools.set(tenantId, dataSource);
      this.initializeMetrics(tenantId, config.poolSize || 10);
      this.updateMetrics(tenantId, startTime, 'acquire', false);

      this.logger.log(
        `Created new connection pool for tenant: ${tenantId} (pool size: ${config.poolSize || 10})`,
      );

      return dataSource;
    } catch (error) {
      this.logger.error(
        `Failed to create connection pool for tenant ${tenantId}:`,
        error,
      );
      throw new Error(
        `Failed to initialize database connection for tenant: ${tenantId}`,
      );
    }
  }

  /**
   * Release a connection pool for a tenant
   */
  async releasePool(tenantId: string): Promise<void> {
    const dataSource = this.connectionPools.get(tenantId);

    if (dataSource) {
      try {
        if (dataSource.isInitialized) {
          await dataSource.destroy();
          this.logger.log(`Released connection pool for tenant: ${tenantId}`);
        }
        this.connectionPools.delete(tenantId);
        this.metrics.delete(tenantId);
      } catch (error) {
        this.logger.error(
          `Error releasing connection pool for tenant ${tenantId}:`,
          error,
        );
      }
    }
  }

  /**
   * Get metrics for a specific tenant
   */
  getMetrics(tenantId: string): IConnectionMetrics | null {
    return this.metrics.get(tenantId) || null;
  }

  /**
   * Get all connection metrics
   */
  getAllMetrics(): Map<string, IConnectionMetrics> {
    return new Map(this.metrics);
  }

  /**
   * Get active connection count for a tenant
   */
  async getActiveConnections(tenantId: string): Promise<number> {
    const dataSource = this.connectionPools.get(tenantId);
    if (!dataSource || !dataSource.isInitialized) {
      return 0;
    }

    try {
      const result = await dataSource.query<Array<{ count: string }>>(
        'SELECT count(*) as count FROM pg_stat_activity WHERE datname = $1',
        [dataSource.options.database as string],
      );
      return parseInt(result[0]?.count || '0', 10);
    } catch {
      this.logger.warn(
        `Could not get active connections for tenant ${tenantId}`,
      );
      return 0;
    }
  }

  /**
   * Close all connection pools
   */
  private async closeAllPools(): Promise<void> {
    const closePromises = Array.from(this.connectionPools.entries()).map(
      async ([tenantId, dataSource]) => {
        try {
          if (dataSource.isInitialized) {
            await dataSource.destroy();
          }
          this.logger.debug(`Closed connection pool for tenant: ${tenantId}`);
        } catch (error) {
          this.logger.error(
            `Error closing connection pool for tenant ${tenantId}:`,
            error,
          );
        }
      },
    );

    await Promise.all(closePromises);
    this.connectionPools.clear();
    this.metrics.clear();
  }

  /**
   * Initialize metrics for a tenant
   */
  private initializeMetrics(tenantId: string, poolSize: number): void {
    this.metrics.set(tenantId, {
      tenantId,
      activeConnections: 0,
      poolSize,
      acquisitionTime: 0,
      lastAcquired: new Date(),
      totalAcquisitions: 0,
      totalReleases: 0,
    });
  }

  /**
   * Update metrics for a tenant
   */
  private updateMetrics(
    tenantId: string,
    startTime: number,
    operation: 'acquire' | 'release',
    isReused: boolean,
  ): void {
    const metrics = this.metrics.get(tenantId);
    if (!metrics) return;

    const duration = Date.now() - startTime;

    if (operation === 'acquire') {
      metrics.totalAcquisitions++;
      if (!isReused) {
        metrics.acquisitionTime = duration;
      }
      metrics.lastAcquired = new Date();
    } else if (operation === 'release') {
      metrics.totalReleases++;
    }
  }
}
