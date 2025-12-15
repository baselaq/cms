import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ClubsController } from './clubs.controller';
import { ClubsService } from './clubs.service';
import { ClubEntity } from '@/database/master/entities/club.entity';
import { ProvisioningMetricsService } from './services/provisioning-metrics.service';
import { AuthModule } from '@/auth/auth.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([ClubEntity]),
    forwardRef(() => AuthModule),
  ],
  controllers: [ClubsController],
  providers: [ClubsService, ProvisioningMetricsService],
  exports: [ClubsService],
})
export class ClubsModule {}
