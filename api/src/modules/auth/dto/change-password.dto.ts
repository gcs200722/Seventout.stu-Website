import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'current_password' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  current_password: string;

  @ApiProperty({ example: 'new_secure_password' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  new_password: string;
}
