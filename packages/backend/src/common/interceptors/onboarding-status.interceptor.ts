import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Response } from 'express';
import type { ITenantContext } from '../../tenant/tenant.context';
import { ClubSettingEntity } from '../../database/tenant/entities/club-setting.entity';

/**
 * Interceptor that adds X-Onboarding-Complete header to all responses
 * This allows the frontend to detect when onboarding is incomplete
 * and redirect the user to complete onboarding
 */
@Injectable()
export class OnboardingStatusInterceptor implements NestInterceptor {
  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { tenantContext?: ITenantContext }>();
    const response = context.switchToHttp().getResponse<Response>();

    // Check if we have a tenant context (authenticated request on subdomain)
    const tenantContext = request.tenantContext;

    if (tenantContext) {
      try {
        // Get onboarding status from club settings
        const { dataSource } = tenantContext;
        const settingsRepo = dataSource.getRepository(ClubSettingEntity);
        const settingsArr = await settingsRepo.find({
          order: { createdAt: 'ASC' },
          take: 1,
        });
        const settings = settingsArr[0] ?? null;

        // Explicitly check if settings exists and onboardingComplete is explicitly true
        // Default to false if settings is null/undefined or onboardingComplete is false/undefined
        const onboardingComplete =
          settings && settings.onboardingComplete === true;

        // Debug logging in development
        if (process.env.NODE_ENV === 'development') {
          console.log(
            `[OnboardingStatusInterceptor] Settings found: ${!!settings}, onboardingComplete: ${settings?.onboardingComplete}`,
          );
        }

        // Add header to response
        response.setHeader(
          'X-Onboarding-Complete',
          onboardingComplete ? 'true' : 'false',
        );
      } catch (error) {
        // If we can't check onboarding status, default to incomplete
        // This is safer - will force users to complete onboarding
        if (process.env.NODE_ENV === 'development') {
          console.error(
            '[OnboardingStatusInterceptor] Error checking onboarding status:',
            error,
          );
        }
        response.setHeader('X-Onboarding-Complete', 'false');
      }
    } else {
      // No tenant context - this is a guest/main domain request
      // Don't set the header (or set it to true if we want to allow access)
      response.setHeader('X-Onboarding-Complete', 'true');
    }

    return next.handle();
  }
}
