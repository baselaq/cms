import {
  IsOptional,
  IsString,
  IsEmail,
  IsEnum,
  IsHexColor,
  MaxLength,
} from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsEnum(['light', 'dark', 'system'])
  themeMode?: 'light' | 'dark' | 'system';

  @IsOptional()
  @IsString()
  @IsHexColor()
  primaryColor?: string;

  @IsOptional()
  @IsString()
  @IsHexColor()
  secondaryColor?: string;

  @IsOptional()
  @IsString()
  @IsHexColor()
  accentColor?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  locale?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  brandingLogoUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  brandingCoverUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  organizationName?: string | null;

  @IsOptional()
  @IsString()
  organizationDescription?: string | null;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  supportEmail?: string | null;
}

