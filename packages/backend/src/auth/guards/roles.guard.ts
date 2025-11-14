import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { PermissionService } from '../services/permission.service';
import { ITenantContext } from '@/tenant/tenant.context';
import { JwtAuthGuard } from './jwt-auth.guard';

@Injectable()
export class RolesGuard extends JwtAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionService: PermissionService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // First check JWT authentication
    const isAuthenticated = await super.canActivate(context);
    if (!isAuthenticated) {
      return false;
    }

    // Get required roles from decorator
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no roles are required, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Get request and tenant context
    const request = context.switchToHttp().getRequest<Request>();
    const tenantContext: ITenantContext | undefined = request.tenantContext;

    if (!tenantContext) {
      throw new Error('Tenant context not found');
    }

    // Get user from request (set by JwtAuthGuard)
    const user = request.user as { userId: string };
    if (!user || !user.userId) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check if user has any of the required roles
    const userRoles = await this.permissionService.getUserRoles(
      tenantContext,
      user.userId,
    );

    const hasRequiredRole = requiredRoles.some((role) =>
      userRoles.includes(role),
    );

    if (!hasRequiredRole) {
      throw new ForbiddenException(
        `Access denied. Required roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
