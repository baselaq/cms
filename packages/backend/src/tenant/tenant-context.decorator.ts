import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { ITenantContext } from './tenant.context';

/**
 * Decorator to inject tenant context in controllers
 * Usage: @TenantContext() context: ITenantContext
 */
export const TenantContext = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): ITenantContext | null => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.tenantContext || null;
  },
);

/**
 * Decorator to inject tenant ID
 * Usage: @TenantId() tenantId: string
 */
export const TenantId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | null => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.tenantContext?.tenantId || null;
  },
);

/**
 * Decorator to inject tenant subdomain
 * Usage: @TenantSubdomain() subdomain: string
 */
export const TenantSubdomain = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | null => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.tenantContext?.subdomain || null;
  },
);
