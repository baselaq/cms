import {
  Injectable,
  Logger,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { IsNull } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes, createHash } from 'crypto';
import { ITenantContext } from '@/tenant/tenant.context';
import { UserEntity } from '@/database/tenant/entities/user.entity';
import { UserTokenEntity } from '@/database/tenant/entities/user-token.entity';
import { ClubSettingEntity } from '@/database/tenant/entities/club-setting.entity';
import { RoleEntity } from '@/database/tenant/entities/role.entity';
import { UserRoleEntity } from '@/database/tenant/entities/user-role.entity';
import {
  LoginDto,
  RegisterDto,
  RefreshTokenDto,
  AuthResponseDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from '@/auth/dto';
import { AuthJwtService } from '@/auth/services/jwt.service';
import { TokenBlacklistService } from '@/auth/services/token-blacklist.service';
import { EmailService } from '@/auth/services/email.service';
import { ClubsService } from '@/clubs/clubs.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: AuthJwtService,
    private readonly blacklistService: TokenBlacklistService,
    private readonly emailService: EmailService,
    @Inject(forwardRef(() => ClubsService))
    private readonly clubsService: ClubsService,
  ) {}

  /**
   * Register a new user and generate tokens
   */
  async register(
    registerDto: RegisterDto,
    tenantContext: ITenantContext,
    ipAddress?: string,
    device?: string,
  ): Promise<AuthResponseDto> {
    // Check if user already exists
    const existingUser = await tenantContext.dataSource
      .getRepository(UserEntity)
      .findOne({ where: { email: registerDto.email.toLowerCase() } });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(registerDto.password, 10);

    // Create user
    const user = await tenantContext.dataSource.getRepository(UserEntity).save(
      tenantContext.dataSource.getRepository(UserEntity).create({
        email: registerDto.email.toLowerCase(),
        password: passwordHash,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        status: 'active',
      }),
    );

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
    await tenantContext.dataSource.getRepository(UserTokenEntity).save({
      userId: user.id,
      token: hashedRefreshToken,
      expiresAt,
      device,
      ipAddress,
    });

    // Get onboarding status from club settings
    const settingsRepo =
      tenantContext.dataSource.getRepository(ClubSettingEntity);
    const settingsArr = await settingsRepo.find({
      order: { createdAt: 'ASC' },
      take: 1,
    });
    const settings = settingsArr[0] ?? null;

    this.logger.log(`User registered: ${user.email}`);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        onboardingComplete: settings?.onboardingComplete ?? false,
      },
    };
  }

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
    const user = await tenantContext.dataSource
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
    await tenantContext.dataSource.getRepository(UserTokenEntity).save({
      userId: user.id,
      token: hashedRefreshToken,
      expiresAt,
      device,
      ipAddress,
    });

    // Update last login
    await tenantContext.dataSource.getRepository(UserEntity).update(user.id, {
      lastLoginAt: new Date(),
    });

    // Get onboarding status from club settings
    const settingsRepo =
      tenantContext.dataSource.getRepository(ClubSettingEntity);
    const settingsArr = await settingsRepo.find({
      order: { createdAt: 'ASC' },
      take: 1,
    });
    const settings = settingsArr[0] ?? null;

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
        onboardingComplete: settings?.onboardingComplete ?? false,
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
    const user = await tenantContext.dataSource
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
    const storedToken = await tenantContext.dataSource
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

    await tenantContext.dataSource
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
      await tenantContext.dataSource
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
  async revokeAllUserTokens(
    userId: string,
    tenantContext: ITenantContext,
  ): Promise<void> {
    // Mark all tokens as revoked
    await tenantContext.dataSource
      .getRepository(UserTokenEntity)
      .update({ userId, revokedAt: IsNull() }, { revokedAt: new Date() });

    this.logger.log(`All tokens revoked for user: ${userId}`);
  }

  /**
   * Request password reset - generates token and sends email
   */
  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
    tenantContext: ITenantContext,
  ): Promise<{ message: string }> {
    // Find user by email
    const user = await tenantContext.dataSource
      .getRepository(UserEntity)
      .findOne({ where: { email: forgotPasswordDto.email } });

    // Don't reveal if user exists for security
    // Always return success message
    if (!user) {
      this.logger.warn(
        `Password reset requested for non-existent email: ${forgotPasswordDto.email}`,
      );
      return {
        message:
          'If an account with that email exists, a password reset link has been sent.',
      };
    }

    // Check if user is active
    if (user.status !== 'active') {
      this.logger.warn(
        `Password reset requested for inactive user: ${user.email}`,
      );
      return {
        message:
          'If an account with that email exists, a password reset link has been sent.',
      };
    }

    // Generate reset token
    const resetToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save reset token to user
    await tenantContext.dataSource.getRepository(UserEntity).update(user.id, {
      passwordResetToken: resetToken,
      passwordResetExpiresAt: expiresAt,
    });

    // Send reset email
    await this.emailService.sendPasswordResetEmail(
      user.email,
      resetToken,
      tenantContext.subdomain,
    );

    this.logger.log(`Password reset email sent to: ${user.email}`);

    return {
      message:
        'If an account with that email exists, a password reset link has been sent.',
    };
  }

  /**
   * Reset password using token
   */
  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
    tenantContext: ITenantContext,
  ): Promise<{ message: string }> {
    // Find user by reset token
    const user = await tenantContext.dataSource
      .getRepository(UserEntity)
      .findOne({
        where: { passwordResetToken: resetPasswordDto.token },
      });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Check if token has expired
    if (
      !user.passwordResetExpiresAt ||
      user.passwordResetExpiresAt < new Date()
    ) {
      // Clear expired token
      await tenantContext.dataSource.getRepository(UserEntity).update(user.id, {
        passwordResetToken: null,
        passwordResetExpiresAt: null,
      });

      throw new BadRequestException('Reset token has expired');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(resetPasswordDto.password, 10);

    // Update password and clear reset token
    await tenantContext.dataSource.getRepository(UserEntity).update(user.id, {
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpiresAt: null,
    });

    // Revoke all user tokens for security
    await this.revokeAllUserTokens(user.id, tenantContext);

    this.logger.log(`Password reset successful for user: ${user.email}`);

    return { message: 'Password has been reset successfully' };
  }

  /**
   * Auto-login admin user using onboarding token
   * This creates a tenant context from the onboarding token
   */
  async loginWithOnboardingToken(
    onboardingToken: string,
    subdomain: string,
    ipAddress?: string,
    device?: string,
  ): Promise<AuthResponseDto> {
    // Get club by subdomain using ClubsService
    const club = await this.clubsService.getClubBySubdomain(subdomain);
    if (!club) {
      throw new NotFoundException(`Club with subdomain ${subdomain} not found`);
    }

    // Validate onboarding token
    const hashedToken = createHash('sha256')
      .update(onboardingToken)
      .digest('hex');
    if (club.onboardingTokenHash !== hashedToken) {
      throw new UnauthorizedException('Invalid onboarding token');
    }

    if (
      club.onboardingTokenExpiresAt &&
      club.onboardingTokenExpiresAt.getTime() < Date.now()
    ) {
      throw new UnauthorizedException('Onboarding token has expired');
    }

    // Get tenant database connection
    const tenantDataSource =
      await this.clubsService.createTenantDataSource(club);

    try {
      // Find admin user (first user with Admin role or first user created)
      const userRepo = tenantDataSource.getRepository(UserEntity);
      const roleRepo = tenantDataSource.getRepository(RoleEntity);
      const userRoleRepo = tenantDataSource.getRepository(UserRoleEntity);

      const adminRole = await roleRepo.findOne({ where: { name: 'Admin' } });
      let adminUser: UserEntity | null = null;

      if (adminRole) {
        const adminUserRole = await userRoleRepo.findOne({
          where: { roleId: adminRole.id },
        });
        if (adminUserRole) {
          adminUser = await userRepo.findOne({
            where: { id: adminUserRole.userId },
          });
        }
      }

      // If no admin found, get first user (should be admin from seed)
      if (!adminUser) {
        const users = await userRepo.find({
          order: { createdAt: 'ASC' },
          take: 1,
        });
        adminUser = users[0] ?? null;
      }

      if (!adminUser) {
        throw new NotFoundException('Admin user not found in tenant database');
      }

      // Build tenant context
      const tenantContext = this.clubsService.buildTenantContext(
        club,
        tenantDataSource,
      );

      // Generate tokens
      const tokens = this.jwtService.generateTokens(
        adminUser.id,
        adminUser.email,
        tenantContext,
      );

      // Hash refresh token for storage
      const hashedRefreshToken = await this.jwtService.hashToken(
        tokens.refreshToken,
      );

      // Calculate expiry
      const expiresIn = parseInt(
        process.env.JWT_REFRESH_EXPIRY || '604800',
        10,
      );
      const expiresAt = new Date(Date.now() + expiresIn * 1000);

      // Store refresh token
      await tenantDataSource.getRepository(UserTokenEntity).save({
        userId: adminUser.id,
        token: hashedRefreshToken,
        expiresAt,
        device,
        ipAddress,
      });

      // Update last login
      await userRepo.update(adminUser.id, {
        lastLoginAt: new Date(),
      });

      // Get onboarding status
      const settingsRepo = tenantDataSource.getRepository(ClubSettingEntity);
      const settings = await settingsRepo.findOne({
        order: { createdAt: 'ASC' },
      });

      this.logger.log(`Auto-login successful for admin: ${adminUser.email}`);

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        user: {
          id: adminUser.id,
          email: adminUser.email,
          firstName: adminUser.firstName,
          lastName: adminUser.lastName,
          onboardingComplete: settings?.onboardingComplete ?? false,
        },
      };
    } finally {
      await tenantDataSource.destroy();
    }
  }
}
