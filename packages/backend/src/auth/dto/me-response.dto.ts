export class MeResponseDto {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: 'active' | 'inactive' | 'suspended';
  roles: string[];
  permissions: string[];
}
