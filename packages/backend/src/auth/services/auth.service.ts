import {
  Injectable,
  Logger,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, IsNull } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { ITenantContext } from '../../tenant/tenant.context';
import { UserEntity } from '../../database/tenant/entities/user.entity';
import { UserTokenEntity } from '../../database/tenant/entities/user-token.entity';
import { LoginDto, RefreshTokenDto, AuthResponseDto } from '../dto';
import { AuthJwtService } from './jwt.service';
import { TokenBlacklistService } from './token-blacklist.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly jwtService: AuthJwtService,
    private readonly blacklistService: TokenBlacklistService,
  ) {}

  /**
   * Authenticate user and generate tokens
   */
  async login(
    loginDto: LoginDto,
    tenantContext: ITenantContext,
    ipAddress?: string,
    device?: string,
  ): Promise<AuthResponseDto> {
    // Find user by email
    const user = await this.dataSource
      .getRepository(UserEntity)
      .findOne({ where: { email: loginDto.email } });

    if (!user) {
      this.logger.warn(
        `Login attempt with non-existent email: ${loginDto.email}`,
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check user status
    if (user.status !== 'active') {
      this.logger.warn(`Login attempt for inactive user: ${user.email}`);
      throw new UnauthorizedException('Account is not active');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      this.logger.warn(`Invalid password for user: ${user.email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens
    const tokens = this.jwtService.generateTokens(
      user.id,
      user.email,
      tenantContext,
    );

    // Hash refresh token for storage
    const hashedRefreshToken = await this.jwtService.hashToken(
      tokens.refreshToken,
    );

    // Calculate expiry
    const expiresIn = parseInt(process.env.JWT_REFRESH_EXPIRY || '604800', 10); // 7 days
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // Store refresh token
    await this.dataSource.getRepository(UserTokenEntity).save({
      userId: user.id,
      token: hashedRefreshToken,
      expiresAt,
      device,
      ipAddress,
    });

    // Update last login
    await this.dataSource.getRepository(UserEntity).update(user.id, {
      lastLoginAt: new Date(),
    });

    this.logger.log(`User logged in: ${user.email}`);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refresh(
    refreshTokenDto: RefreshTokenDto,
    tenantContext: ITenantContext,
  ): Promise<AuthResponseDto> {
    // Check if token is blacklisted
    const isBlacklisted = await this.blacklistService.isBlacklisted(
      refreshTokenDto.refreshToken,
    );
    if (isBlacklisted) {
      throw new UnauthorizedException('Token has been revoked');
    }

    // Verify refresh token
    const payload = this.jwtService.verifyRefreshToken(
      refreshTokenDto.refreshToken,
      tenantContext,
    );

    // Find user
    const user = await this.dataSource
      .getRepository(UserEntity)
      .findOne({ where: { id: payload.sub } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check user status
    if (user.status !== 'active') {
      throw new UnauthorizedException('Account is not active');
    }

    // Check if stored token exists and matches
    const storedToken = await this.dataSource
      .getRepository(UserTokenEntity)
      .findOne({
        where: { userId: user.id, revokedAt: IsNull() },
        order: { createdAt: 'DESC' },
      });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired or invalid');
    }

    // Compare token with stored hash
    const isValid = await this.jwtService.compareToken(
      refreshTokenDto.refreshToken,
      storedToken.token,
    );

    if (!isValid) {
      this.logger.warn(`Invalid refresh token for user: ${user.email}`);
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Generate new tokens
    const tokens = this.jwtService.generateTokens(
      user.id,
      user.email,
      tenantContext,
    );

    // Update stored refresh token
    const hashedNewRefreshToken = await this.jwtService.hashToken(
      tokens.refreshToken,
    );
    const expiresIn = parseInt(process.env.JWT_REFRESH_EXPIRY || '604800', 10);
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    await this.dataSource
      .getRepository(UserTokenEntity)
      .update(storedToken.id, {
        token: hashedNewRefreshToken,
        expiresAt,
      });

    this.logger.log(`Token refreshed for user: ${user.email}`);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }

  /**
   * Logout - revoke refresh token
   */
  async logout(
    refreshToken: string,
    tenantContext: ITenantContext,
  ): Promise<void> {
    try {
      // Verify token to get payload
      const payload = this.jwtService.verifyRefreshToken(
        refreshToken,
        tenantContext,
      );

      // Mark token as revoked in database
      await this.dataSource
        .getRepository(UserTokenEntity)
        .update(
          { userId: payload.sub, revokedAt: IsNull() },
          { revokedAt: new Date() },
        );

      // Add tokens to blacklist
      await this.blacklistService.addToBlacklist(refreshToken);

      this.logger.log(`User logged out: ${payload.email}`);
    } catch (error) {
      // Even if token verification fails, we should still try to handle logout gracefully
      this.logger.warn('Logout with invalid token', error);
    }
  }

  /**
   * Revoke all tokens for a user (e.g., password reset or security breach)
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    // Mark all tokens as revoked
    await this.dataSource
      .getRepository(UserTokenEntity)
      .update({ userId, revokedAt: IsNull() }, { revokedAt: new Date() });

    this.logger.log(`All tokens revoked for user: ${userId}`);
  }
}
