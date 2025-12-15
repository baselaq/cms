import { IsString } from 'class-validator';

export class LoginWithOnboardingTokenDto {
  @IsString()
  onboardingToken: string;
}
