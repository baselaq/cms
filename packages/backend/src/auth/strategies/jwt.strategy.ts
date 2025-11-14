import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { ITenantContext } from '@/tenant/tenant.context';
import { AuthJwtService, IJwtPayload } from '../services/jwt.service';
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
      passReqToCallback: true,
      secretOrKeyProvider: (
        request: Request,
        rawJwtToken: string | Buffer,
        done: (err: Error | null, secret?: string | Buffer) => void,
      ) => {
        const tenantContext: ITenantContext | undefined = request.tenantContext;

        if (!tenantContext) {
          this.logger.error(
            'No tenant context found while resolving JWT secret',
          );
          return done(new UnauthorizedException('Tenant context not found'));
        }

        try {
          const secret = this.jwtService.getTenantSecret(tenantContext);
          return done(null, secret);
        } catch (error) {
          this.logger.error(
            'Failed to resolve tenant-specific JWT secret',
            error as Error,
          );
          return done(error as Error);
        }
      },
    });
  }

  async validate(req: Request, payload: IJwtPayload) {
    // Get tenant context from request
    const tenantContext: ITenantContext | undefined = req.tenantContext;

    if (!tenantContext) {
      this.logger.error('No tenant context found in request');
      if (process.env.NODE_ENV === 'development') {
        this.logger.debug(`Request URL: ${req.url}`);
        this.logger.debug(`Request method: ${req.method}`);
        this.logger.debug(
          `Request headers: ${JSON.stringify(Object.keys(req.headers))}`,
        );
      }
      throw new UnauthorizedException('Tenant context not found');
    }

    // Extract token from header
    const authHeader = req.headers.authorization;
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);

    if (process.env.NODE_ENV === 'development') {
      this.logger.debug(
        `Authorization header: ${authHeader ? 'present' : 'missing'}`,
      );
      if (authHeader) {
        this.logger.debug(
          `Authorization header preview: ${authHeader.substring(0, 50)}...`,
        );
      }
    }

    if (!token) {
      this.logger.error(
        `No token provided for /auth/me. Authorization header: ${authHeader ? 'present' : 'missing'}`,
      );
      if (authHeader) {
        this.logger.error(
          `Authorization header value: ${authHeader.substring(0, 100)}...`,
        );
      }
      this.logger.error(
        `Request headers: ${JSON.stringify(Object.keys(req.headers))}`,
      );
      throw new UnauthorizedException('No token provided');
    }

    this.logger.log(
      `🔍 Validating token for tenant ${tenantContext.subdomain} (${tenantContext.tenantId})`,
    );
    if (process.env.NODE_ENV === 'development') {
      this.logger.debug(`Token preview: ${token.substring(0, 30)}...`);
    }

    // Check blacklist
    const isBlacklisted = await this.blacklistService.isBlacklisted(token);
    if (isBlacklisted) {
      throw new UnauthorizedException('Token has been revoked');
    }

    // Extra safety checks on payload
    if (payload.type !== 'access') {
      this.logger.error(
        `Invalid token type: expected 'access', got '${payload.type}'`,
      );
      throw new UnauthorizedException('Invalid token type');
    }

    if (payload.tenantId !== tenantContext.tenantId) {
      this.logger.error(
        `Token tenant mismatch: token has ${payload.tenantId}, context has ${tenantContext.tenantId}`,
      );
      throw new UnauthorizedException('Token does not match tenant');
    }

    if (process.env.NODE_ENV === 'development') {
      this.logger.log(
        `✅ Token validated successfully for user ${payload.email} (${payload.sub})`,
      );
    }

    // Attach user info to request
    return {
      userId: payload.sub,
      email: payload.email,
      tenantId: payload.tenantId,
      subdomain: payload.subdomain,
    };
  }
}
