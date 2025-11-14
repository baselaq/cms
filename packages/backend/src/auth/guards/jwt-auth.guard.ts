import { Injectable, ExecutionContext, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { ITenantContext } from '../../tenant/tenant.context';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const tenantContext: ITenantContext | undefined = request.tenantContext;

    // Ensure tenant context is set before JWT validation
    if (!tenantContext) {
      this.logger.error(
        'JwtAuthGuard: Tenant context not found. TenantResolverGuard must run first.',
      );
      if (process.env.NODE_ENV === 'development') {
        this.logger.debug(`Request URL: ${request.url}`);
        this.logger.debug(`Request method: ${request.method}`);
        this.logger.debug(
          `Request headers: ${JSON.stringify(Object.keys(request.headers))}`,
        );
        this.logger.debug(
          `Authorization header: ${request.headers.authorization ? 'present' : 'missing'}`,
        );
      }
      return false;
    }

    if (process.env.NODE_ENV === 'development') {
      this.logger.debug(
        `JwtAuthGuard: Validating JWT for tenant ${tenantContext.subdomain} (${tenantContext.tenantId})`,
      );
      this.logger.debug(
        `Authorization header: ${request.headers.authorization ? 'present' : 'missing'}`,
      );
    }

    return super.canActivate(context) as Promise<boolean>;
  }
}
