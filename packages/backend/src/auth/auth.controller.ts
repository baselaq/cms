import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import type { LoginDto, RefreshTokenDto } from './dto';
import { AuthService } from './services';
import type { ITenantContext } from '../tenant/tenant.context';
import { TenantResolverGuard } from '../tenant/tenant-resolver.guard';

@Controller('auth')
@UseGuards(TenantResolverGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    const tenantContext: ITenantContext | undefined = req.tenantContext;
    if (!tenantContext) {
      throw new Error('Tenant context not found');
    }
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    return this.authService.login(
      loginDto,
      tenantContext,
      ipAddress,
      userAgent,
    );
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
}
