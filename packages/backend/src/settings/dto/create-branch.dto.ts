import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEmail,
  IsInt,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class CreateBranchDto {
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must be kebab-case (lowercase letters, numbers, and hyphens only)',
  })
  slug: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  zipCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  website?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

