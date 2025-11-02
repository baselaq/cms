import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';

export class TenantConfigDto {
  @IsString()
  host: string;

  @IsNumber()
  @Min(1)
  @Max(65535)
  port: number;

  @IsString()
  database: string;

  @IsString()
  username: string;

  @IsString()
  password: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  poolSize?: number;
}
