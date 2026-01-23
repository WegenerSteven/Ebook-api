import {
  IsString,
  IsOptional,
  IsEmail,
  MinLength,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { UserRole } from '../../entities';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}

export class AdminUpdateUserDto extends UpdateUserDto {
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
