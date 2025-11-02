import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { ITenantContext } from '@/tenant/tenant.context';
import * as bcrypt from 'bcrypt';

export interface IJwtPayload {
  sub: string; // user id
  email: string;
  tenantId: string;
  subdomain: string;
  type: 'access' | 'refresh';
}

export interface ITokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class AuthJwtService {
  private readonly logger = new Logger(AuthJwtService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Generate a per-tenant secret based on tenant info and master secret
   */
  private getTenantSecret(tenantContext: ITenantContext): string {
    const masterSecret =
      this.configService.get<string>('JWT_SECRET') || 'default-secret';
    // Combine master secret with tenant-specific info for unique per-tenant secrets
    const tenantSpecific = `${tenantContext.subdomain}-${tenantContext.tenantId}`;
    return `${masterSecret}-${tenantSpecific}`;
  }

  /**
   * Generate access and refresh tokens
   */
  generateTokens(
    userId: string,
    email: string,
    tenantContext: ITenantContext,
  ): ITokenResponse {
    const payload: IJwtPayload = {
      sub: userId,
      email,
      tenantId: tenantContext.tenantId,
      subdomain: tenantContext.subdomain,
      type: 'access',
    };

    const refreshPayload: IJwtPayload = {
      ...payload,
      type: 'refresh',
    };

    const accessTokenExpiry = parseInt(
      this.configService.get<string>('JWT_ACCESS_EXPIRY') || '900',
      10,
    ); // 15 minutes
    const refreshTokenExpiry = parseInt(
      this.configService.get<string>('JWT_REFRESH_EXPIRY') || '604800',
      10,
    ); // 7 days

    const tenantSecret = this.getTenantSecret(tenantContext);

    const accessToken = this.jwtService.sign(payload, {
      secret: tenantSecret,
      expiresIn: accessTokenExpiry,
    });

    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: tenantSecret,
      expiresIn: refreshTokenExpiry,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: accessTokenExpiry,
    };
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token: string, tenantContext: ITenantContext): IJwtPayload {
    try {
      const tenantSecret = this.getTenantSecret(tenantContext);
      const payload = this.jwtService.verify<IJwtPayload>(token, {
        secret: tenantSecret,
      });

      if (payload.type !== 'access') {
        throw new UnauthorizedException('Invalid token type');
      }

      if (payload.tenantId !== tenantContext.tenantId) {
        throw new UnauthorizedException('Token does not match tenant');
      }

      return payload;
    } catch (error) {
      this.logger.error('Token verification failed', error);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  /**
   * Verify refresh token
   */
  verifyRefreshToken(
    token: string,
    tenantContext: ITenantContext,
  ): IJwtPayload {
    try {
      const tenantSecret = this.getTenantSecret(tenantContext);
      const payload = this.jwtService.verify<IJwtPayload>(token, {
        secret: tenantSecret,
      });

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      if (payload.tenantId !== tenantContext.tenantId) {
        throw new UnauthorizedException('Token does not match tenant');
      }

      return payload;
    } catch (error) {
      this.logger.error('Refresh token verification failed', error);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * Hash refresh token for storage
   */
  async hashToken(token: string): Promise<string> {
    return bcrypt.hash(token, 10);
  }

  /**
   * Compare stored hash with provided token
   */
  async compareToken(token: string, hash: string): Promise<boolean> {
    return bcrypt.compare(token, hash);
  }
}
