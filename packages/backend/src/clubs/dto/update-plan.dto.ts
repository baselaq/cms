import { IsIn, IsString } from 'class-validator';

export class UpdatePlanDto {
  @IsString()
  @IsIn(['starter', 'pro', 'elite'])
  planCode: 'starter' | 'pro' | 'elite';

  @IsString()
  @IsIn(['monthly', 'annual'])
  billingCycle: 'monthly' | 'annual';
}
