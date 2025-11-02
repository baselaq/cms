import { Controller, Get, UseGuards } from '@nestjs/common';
import { TenantResolverGuard } from '../tenant-resolver.guard';
import {
  TenantContext,
  TenantId,
  TenantSubdomain,
} from '../tenant-context.decorator';
import { TenantContextService } from '../tenant-context.service';
import { ConnectionManagerService } from '../connection-manager.service';
import type { ITenantContext } from '../tenant.context';

/**
 * Example controller demonstrating tenant-aware operations
 */
@Controller('api')
@UseGuards(TenantResolverGuard) // Apply guard to all routes in this controller
export class TenantExampleController {
  constructor(
    private readonly tenantContextService: TenantContextService,
    private readonly connectionManager: ConnectionManagerService,
  ) {}

  /**
   * Example: Using decorators to inject tenant context
   */
  @Get('tenant-info')
  getTenantInfo(
    @TenantContext() context: ITenantContext,
    @TenantId() tenantId: string,
    @TenantSubdomain() subdomain: string,
  ) {
    return {
      tenantId,
      subdomain,
      database: context.dbConfig.database,
      host: context.dbConfig.host,
    };
  }

  /**
   * Example: Using service to access tenant context
   */
  @Get('connection-metrics')
  getConnectionMetrics(@TenantContext() context: ITenantContext) {
    const metrics = this.connectionManager.getMetrics(context.tenantId);
    return {
      tenantId: context.tenantId,
      metrics,
    };
  }

  /**
   * Example: Executing queries on tenant-specific database
   */
  @Get('query-example')
  async executeQuery(@TenantContext() context: ITenantContext) {
    // Use the tenant's DataSource to execute queries
    const result: Array<{ database: string; version: string }> =
      await context.dataSource.query(
        'SELECT current_database() as database, version() as version',
      );
    return {
      tenant: context.subdomain,
      queryResult: result[0],
    };
  }
}
