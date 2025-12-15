import { UserEntity } from '@/database/tenant/entities/user.entity';

export class AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    onboardingComplete?: boolean;
  };
}

export function mapUserToAuthResponse(
  user: UserEntity,
  accessToken: string,
  refreshToken: string,
  expiresIn: number,
): AuthResponseDto {
  return {
    accessToken,
    refreshToken,
    expiresIn,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    },
  };
}
