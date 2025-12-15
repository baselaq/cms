import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
  Logger,
} from '@nestjs/common';
import type { Request } from 'express';
import type {
  LoginDto,
  RegisterDto,
  RefreshTokenDto,
  MeResponseDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  LoginWithOnboardingTokenDto,
} from './dto';
import { AuthService, PermissionService } from './services';
import type { ITenantContext } from '../tenant/tenant.context';
import { TenantResolverGuard } from '../tenant/tenant-resolver.guard';
import { ClubsService } from '../clubs/clubs.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { UserEntity, ClubSettingEntity } from '../database/tenant/entities';

@Controller('auth')
@UseGuards(TenantResolverGuard)
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly permissionService: PermissionService,
    private readonly clubsService: ClubsService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto, @Req() req: Request) {
    const tenantContext: ITenantContext | undefined = req.tenantContext;
    if (!tenantContext) {
      throw new Error('Tenant context not found');
    }
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const response = await this.authService.register(
      registerDto,
      tenantContext,
      ipAddress,
      userAgent,
    );

    this.logger.log(`User registered: ${registerDto.email}`);
    return response;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    const tenantContext: ITenantContext | undefined = req.tenantContext;
    if (!tenantContext) {
      throw new Error('Tenant context not found');
    }
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const response = await this.authService.login(
      loginDto,
      tenantContext,
      ipAddress,
      userAgent,
    );

    // Log response in development to debug empty preview issue
    if (process.env.NODE_ENV === 'development') {
      this.logger.debug(
        `Login response: ${JSON.stringify({
          hasAccessToken: !!response.accessToken,
          hasRefreshToken: !!response.refreshToken,
          expiresIn: response.expiresIn,
          userId: response.user?.id,
          userEmail: response.user?.email,
        })}`,
      );
    }

    return response;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() refreshTokenDto: RefreshTokenDto, @Req() req: Request) {
    const tenantContext: ITenantContext | undefined = req.tenantContext;
    if (!tenantContext) {
      throw new Error('Tenant context not found');
    }
    return this.authService.refresh(refreshTokenDto, tenantContext);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Body() refreshTokenDto: RefreshTokenDto, @Req() req: Request) {
    const tenantContext: ITenantContext | undefined = req.tenantContext;
    if (!tenantContext) {
      throw new Error('Tenant context not found');
    }
    await this.authService.logout(refreshTokenDto.refreshToken, tenantContext);
    return { message: 'Logged out successfully' };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
    @Req() req: Request,
  ) {
    const tenantContext: ITenantContext | undefined = req.tenantContext;
    if (!tenantContext) {
      throw new Error('Tenant context not found');
    }
    return this.authService.forgotPassword(forgotPasswordDto, tenantContext);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
    @Req() req: Request,
  ) {
    const tenantContext: ITenantContext | undefined = req.tenantContext;
    if (!tenantContext) {
      throw new Error('Tenant context not found');
    }
    return this.authService.resetPassword(resetPasswordDto, tenantContext);
  }

  /**
   * Auto-login admin user using onboarding token
   * This endpoint doesn't require tenant context - it creates it from the onboarding token
   */
  @Post('login-with-onboarding-token')
  @HttpCode(HttpStatus.OK)
  async loginWithOnboardingToken(
    @Body() dto: LoginWithOnboardingTokenDto,
    @Req() req: Request,
  ) {
    const subdomain = req.headers['x-tenant-subdomain'] as string;
    if (!subdomain) {
      throw new Error('X-Tenant-Subdomain header is required');
    }

    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    return this.authService.loginWithOnboardingToken(
      dto.onboardingToken,
      subdomain,
      ipAddress,
      userAgent,
    );
  }

  /**
   * Get current authenticated user with roles and permissions
   */
  @Get('me')
  @UseGuards(TenantResolverGuard, JwtAuthGuard)
  async getMe(
    @CurrentUser() user: { userId: string },
    @Req() req: Request,
  ): Promise<MeResponseDto> {
    if (process.env.NODE_ENV === 'development') {
      this.logger.debug(`/auth/me called for user: ${user?.userId}`);
      this.logger.debug(`Authorization header: ${req.headers.authorization}`);
    }

    const tenantContext: ITenantContext | undefined = req.tenantContext;
    if (!tenantContext) {
      this.logger.error('Tenant context not found in /auth/me');
      throw new Error('Tenant context not found');
    }

    if (process.env.NODE_ENV === 'development') {
      this.logger.debug(
        `Tenant context: ${tenantContext.subdomain} (${tenantContext.tenantId})`,
      );
    }

    const { dataSource } = tenantContext;
    const userRepo = dataSource.getRepository(UserEntity);

    const userEntity = await userRepo.findOne({
      where: { id: user.userId },
    });

    if (!userEntity) {
      throw new Error('User not found');
    }

    // Get user roles and permissions
    const roles = await this.permissionService.getUserRoles(
      tenantContext,
      user.userId,
    );
    const permissions = await this.permissionService.getUserPermissions(
      tenantContext,
      user.userId,
    );

    // Get onboarding status from club settings
    const settingsRepo = dataSource.getRepository(ClubSettingEntity);
    const settingsArr = await settingsRepo.find({
      order: { createdAt: 'ASC' },
      take: 1,
    });
    const settings = settingsArr[0] ?? null;

    // Explicitly check if settings exists and onboardingComplete is explicitly true
    // Default to false if settings is null/undefined or onboardingComplete is false/undefined
    const onboardingComplete = settings && settings.onboardingComplete === true;

    const response: MeResponseDto = {
      id: userEntity.id,
      email: userEntity.email,
      firstName: userEntity.firstName,
      lastName: userEntity.lastName,
      status: userEntity.status,
      roles,
      permissions,
      onboardingComplete: onboardingComplete ?? false,
    };
    return response;
  }
}
