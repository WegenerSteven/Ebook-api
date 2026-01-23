import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
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
}
