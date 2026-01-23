import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { UserRole } from '../../entities';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @IsString()
  @MinLength(2)
  @ApiProperty({ example: 'John Doe', description: 'Full name of the user' })
  name: string;

  @IsEmail()
  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'Email address of the user',
  })
  email: string;

  @IsString()
  @MinLength(6)
  @ApiProperty({
    example: 'strongPassword123',
    description: 'Password for the user account',
  })
  password: string;

  @IsOptional()
  @IsEnum(UserRole)
  @ApiProperty({
    example: UserRole.USER,
    description: 'Role of the user',
    required: false,
  })
  role?: UserRole;
}
