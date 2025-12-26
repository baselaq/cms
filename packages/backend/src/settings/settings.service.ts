import { Injectable, Logger } from '@nestjs/common';
import { ITenantContext } from '../tenant/tenant.context';
import { ClubSettingEntity } from '../database/tenant/entities/club-setting.entity';

export interface UpdateSettingsDto {
  themeMode?: 'light' | 'dark' | 'system';
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  timezone?: string;
  locale?: string;
  brandingLogoUrl?: string | null;
  brandingCoverUrl?: string | null;
  organizationName?: string | null;
  organizationDescription?: string | null;
  supportEmail?: string | null;
}

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  /**
   * Get current club settings
   */
  async getSettings(tenantContext: ITenantContext): Promise<ClubSettingEntity> {
    const { dataSource } = tenantContext;
    const settingsRepo = dataSource.getRepository(ClubSettingEntity);

    const settingsList = await settingsRepo.find({
      order: { createdAt: 'ASC' },
      take: 1,
    });

    const settings = settingsList[0];

    if (!settings) {
      // Create default settings if none exist
      return await settingsRepo.save(settingsRepo.create({}));
    }

    return settings;
  }

  /**
   * Update club settings
   */
  async updateSettings(
    tenantContext: ITenantContext,
    dto: UpdateSettingsDto,
  ): Promise<ClubSettingEntity> {
    const { dataSource } = tenantContext;
    const settingsRepo = dataSource.getRepository(ClubSettingEntity);

    const settingsList = await settingsRepo.find({
      order: { createdAt: 'ASC' },
      take: 1,
    });

    let settings = settingsList[0];

    if (!settings) {
      settings = settingsRepo.create({});
    }

    // Update only provided fields
    if (dto.themeMode !== undefined) {
      settings.themeMode = dto.themeMode;
    }
    if (dto.primaryColor !== undefined) {
      settings.primaryColor = dto.primaryColor;
    }
    if (dto.secondaryColor !== undefined) {
      settings.secondaryColor = dto.secondaryColor;
    }
    if (dto.accentColor !== undefined) {
      settings.accentColor = dto.accentColor;
    }
    if (dto.timezone !== undefined) {
      settings.timezone = dto.timezone;
    }
    if (dto.locale !== undefined) {
      settings.locale = dto.locale;
    }
    if (dto.brandingLogoUrl !== undefined) {
      settings.brandingLogoUrl = dto.brandingLogoUrl;
    }
    if (dto.brandingCoverUrl !== undefined) {
      settings.brandingCoverUrl = dto.brandingCoverUrl;
    }
    if (dto.organizationName !== undefined) {
      settings.organizationName = dto.organizationName;
    }
    if (dto.organizationDescription !== undefined) {
      settings.organizationDescription = dto.organizationDescription;
    }
    if (dto.supportEmail !== undefined) {
      settings.supportEmail = dto.supportEmail;
    }

    const updated = await settingsRepo.save(settings);
    this.logger.log(`Settings updated for tenant: ${tenantContext.subdomain}`);

    return updated;
  }
}

