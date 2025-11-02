import { ITenantContext } from '../tenant/tenant.context';

declare global {
  namespace Express {
    interface Request {
      tenantContext?: ITenantContext;
    }
  }
}

export {};
