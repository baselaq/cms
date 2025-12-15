import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ClubsService } from './clubs.service';
import { RegisterClubDto } from './dto/register-club.dto';
import { ProvisioningMetricsService } from './services/provisioning-metrics.service';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { InviteMembersDto } from './dto/invite-members.dto';
import { UpdatePlanResponseDto } from './dto/update-plan-response.dto';
import { CheckSlugResponseDto } from './dto/check-slug-response.dto';
import { ThrottleGuard } from './guards/throttle.guard';

@Controller('api/clubs')
export class ClubsController {
  constructor(
    private readonly clubsService: ClubsService,
    private readonly metrics: ProvisioningMetricsService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  )
  register(@Body() dto: RegisterClubDto) {
    return this.clubsService.registerClub(dto);
  }

  @Patch(':id/plan')
  @HttpCode(HttpStatus.OK)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  )
  async updatePlan(
    @Param('id') clubId: string,
    @Body() dto: UpdatePlanDto,
    @Headers('x-onboarding-token') onboardingToken?: string,
  ): Promise<UpdatePlanResponseDto> {
    return await this.clubsService.updatePlan(clubId, dto, onboardingToken);
  }

  @Post(':id/invite')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  )
  inviteMembers(
    @Param('id') clubId: string,
    @Body() dto: InviteMembersDto,
    @Headers('x-onboarding-token') onboardingToken?: string,
  ) {
    return this.clubsService.inviteMembers(clubId, dto, onboardingToken);
  }

  @Patch(':id/complete')
  @HttpCode(HttpStatus.OK)
  completeOnboarding(
    @Param('id') clubId: string,
    @Headers('x-onboarding-token') onboardingToken?: string,
  ) {
    return this.clubsService.completeOnboarding(clubId, onboardingToken);
  }

  @Get('provisioning/metrics')
  getProvisioningMetrics() {
    return this.metrics.snapshot();
  }

  @Get('check-slug/:slug')
  @HttpCode(HttpStatus.OK)
  @UseGuards(new ThrottleGuard(10, 60000)) // 10 requests per 60 seconds
  async checkSlugAvailability(
    @Param('slug') slug: string,
  ): Promise<CheckSlugResponseDto> {
    return this.clubsService.checkSlugAvailability(slug);
  }

  @Get('by-slug/:slug')
  @HttpCode(HttpStatus.OK)
  async getClubBySlug(@Param('slug') slug: string) {
    return this.clubsService.getClubBySlug(slug);
  }
}
