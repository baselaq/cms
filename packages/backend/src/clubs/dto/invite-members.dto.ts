import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class InviteMemberDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsIn(['admin', 'coach', 'staff', 'parent', 'player'])
  role: 'admin' | 'coach' | 'staff' | 'parent' | 'player';

  @IsOptional()
  @IsString()
  invitedBy?: string;
}

export class InviteMembersDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => InviteMemberDto)
  invites: InviteMemberDto[];
}
