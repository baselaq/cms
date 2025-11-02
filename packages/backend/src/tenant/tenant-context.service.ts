import { Injectable, Logger } from '@nestjs/common';
import { Request } from 'express';
import { ITenantContext } from './tenant.context';

/**
 * Service to access tenant context from ExecutionContext
 * This allows any service/controller to access tenant information
 */
@Injectable()
export class TenantContextService {
  private readonly logger = new Logger(TenantContextService.name);

  /**
   * Get tenant context from request object
   * The tenant context is set by TenantResolverGuard
   */
  getTenantContext(request: Request): ITenantContext | null {
    return request.tenantContext || null;
  }

  /**
   * Check if tenant context exists
   */
  hasTenantContext(request: Request): boolean {
    return !!request.tenantContext;
  }

  /**
   * Get tenant ID from context
   */
  getTenantId(request: Request): string | null {
    const context = this.getTenantContext(request);
    return context?.tenantId || null;
  }

  /**
   * Get subdomain from context
   */
  getSubdomain(request: Request): string | null {
    const context = this.getTenantContext(request);
    return context?.subdomain || null;
  }

  /**
   * Get tenant DataSource from context
   */
  getDataSource(request: Request) {
    const context = this.getTenantContext(request);
    return context?.dataSource || null;
  }
}
