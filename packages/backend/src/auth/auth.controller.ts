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
import type { LoginDto, RefreshTokenDto, MeResponseDto } from './dto';
import { AuthService, PermissionService } from './services';
import type { ITenantContext } from '../tenant/tenant.context';
import { TenantResolverGuard } from '../tenant/tenant-resolver.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { UserEntity } from '../database/tenant/entities';

@Controller('auth')
@UseGuards(TenantResolverGuard)
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly permissionService: PermissionService,
  ) {}

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

    const response: MeResponseDto = {
      id: userEntity.id,
      email: userEntity.email,
      firstName: userEntity.firstName,
      lastName: userEntity.lastName,
      status: userEntity.status,
      roles,
      permissions,
    };
    return response;
  }
}
