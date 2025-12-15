export interface UpdatePlanResponseDto {
  planCode: string;
  billingCycle: 'monthly' | 'annual';
  status: 'trialing' | 'active' | 'canceled';
  memberLimit: number;
  coachLimit: number;
}
