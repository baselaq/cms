import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TenantModule } from './tenant/tenant.module';
import { TestTenantController } from './test-tenant.controller';
import { AuthModule } from './auth/auth.module';
import { ClubsModule } from './clubs/clubs.module';
import { SettingsModule } from './settings/settings.module';
import { OnboardingStatusInterceptor } from './common/interceptors/onboarding-status.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    TenantModule,
    AuthModule,
    ClubsModule,
    SettingsModule,
  ],
  controllers: [AppController, TestTenantController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: OnboardingStatusInterceptor,
    },
  ],
})
export class AppModule {}
