import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { FileUploadService } from './services/file-upload.service';
import { BranchesService } from './services/branches.service';
import { TenantModule } from '../tenant/tenant.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TenantModule, AuthModule],
  controllers: [SettingsController],
  providers: [SettingsService, FileUploadService, BranchesService],
  exports: [SettingsService, FileUploadService, BranchesService],
})
export class SettingsModule {}
