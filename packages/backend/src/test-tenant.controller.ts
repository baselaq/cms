import { Controller, Get, UseGuards } from '@nestjs/common';
import { TenantResolverGuard } from './tenant/tenant-resolver.guard';
import {
  TenantContext,
  TenantId,
  TenantSubdomain,
} from './tenant/tenant-context.decorator';
import { ConnectionManagerService } from './tenant/connection-manager.service';
import type { ITenantContext } from './tenant/tenant.context';

/**
 * Test controller for tenant resolver functionality
 * This controller demonstrates and tests all tenant features
 */
@Controller('test')
@UseGuards(TenantResolverGuard)
export class TestTenantController {
  constructor(private readonly connectionManager: ConnectionManagerService) {}

  /**
   * Test endpoint: Get tenant information
   * Tests: Tenant context injection, decorators
   */
  @Get('info')
  getTenantInfo(
    @TenantContext() context: ITenantContext,
    @TenantId() tenantId: string,
    @TenantSubdomain() subdomain: string,
  ) {
    return {
      success: true,
      tenantId,
      subdomain,
      clubName: context.metadata.name,
      database: context.dbConfig.database,
      host: context.dbConfig.host,
      port: context.dbConfig.port,
      poolSize: context.dbConfig.poolSize,
      status: context.metadata.status,
      message: 'Tenant context successfully resolved',
    };
  }

  /**
   * Test endpoint: Execute database query
   * Tests: Tenant-specific DataSource connection
   */
  @Get('query')
  async testQuery(@TenantContext() context: ITenantContext) {
    try {
      const result: Array<{
        database: string;
        version: string;
        user: string;
      }> = await context.dataSource.query(
        'SELECT current_database() as database, version() as version, current_user as user',
      );
      return {
        success: true,
        tenant: context.subdomain,
        queryResult: result[0],
        message: 'Database query executed successfully on tenant database',
      };
    } catch (error) {
      return {
        success: false,
        tenant: context.subdomain,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to execute database query',
      };
    }
  }

  /**
   * Test endpoint: Get connection metrics
   * Tests: Connection pool monitoring
   */
  @Get('metrics')
  getMetrics(@TenantId() tenantId: string) {
    const metrics = this.connectionManager.getMetrics(tenantId);
    return {
      success: true,
      tenantId,
      metrics: metrics || { message: 'No metrics available yet' },
    };
  }

  /**
   * Test endpoint: Get all connection metrics
   * Tests: Connection manager state
   */
  @Get('metrics/all')
  getAllMetrics() {
    const allMetrics = this.connectionManager.getAllMetrics();
    const metricsArray = Array.from(allMetrics.values());
    return {
      success: true,
      totalTenants: metricsArray.length,
      metrics: metricsArray,
    };
  }

  /**
   * Test endpoint: Health check
   * Tests: Basic tenant resolution without database query
   */
  @Get('health')
  healthCheck(
    @TenantSubdomain() subdomain: string,
    @TenantId() tenantId: string,
  ) {
    return {
      success: true,
      status: 'healthy',
      tenant: subdomain,
      tenantId,
      timestamp: new Date().toISOString(),
    };
  }
}
