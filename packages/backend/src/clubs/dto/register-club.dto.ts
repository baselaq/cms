import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const SUBDOMAIN_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class RegisterClubDto {
  @IsString()
  @MaxLength(255)
  clubName: string;

  @IsString()
  @Matches(SUBDOMAIN_REGEX, {
    message:
      'subdomain must be kebab-case and can only include lowercase letters, numbers, and hyphens',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : '',
  )
  subdomain: string;

  @IsEmail()
  adminEmail: string;

  @IsString()
  @MinLength(1)
  adminFirstName: string;

  @IsString()
  @MinLength(1)
  adminLastName: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  adminPassword: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  timezone?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(starter|pro|elite)$/i, {
    message: 'planCode must be starter, pro, or elite',
  })
  planCode?: string;
}
