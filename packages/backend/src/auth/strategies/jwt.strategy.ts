import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { ITenantContext } from '@/tenant/tenant.context';
import { AuthJwtService } from '../services/jwt.service';
import { TokenBlacklistService } from '../services/token-blacklist.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private readonly jwtService: AuthJwtService,
    private readonly blacklistService: TokenBlacklistService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: 'placeholder', // Will be dynamically verified
      passReqToCallback: true,
    });
  }

  async validate(req: Request) {
    // Get tenant context from request
    const tenantContext: ITenantContext | undefined = req.tenantContext;

    if (!tenantContext) {
      this.logger.error('No tenant context found in request');
      throw new UnauthorizedException('Tenant context not found');
    }

    // Extract token from header
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    // Check blacklist
    const isBlacklisted = await this.blacklistService.isBlacklisted(token);
    if (isBlacklisted) {
      throw new UnauthorizedException('Token has been revoked');
    }

    // Verify token with tenant-specific secret
    try {
      const verifiedPayload = this.jwtService.verifyAccessToken(
        token,
        tenantContext,
      );

      // Attach user info to request
      return {
        userId: verifiedPayload.sub,
        email: verifiedPayload.email,
        tenantId: verifiedPayload.tenantId,
        subdomain: verifiedPayload.subdomain,
      };
    } catch (error) {
      this.logger.error('Token validation failed', error);
      throw new UnauthorizedException('Invalid token');
    }
  }
}
