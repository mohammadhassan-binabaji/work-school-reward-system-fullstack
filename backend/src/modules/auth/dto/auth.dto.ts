import { IsNotEmpty, Matches, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InitialAdminDto {
  @ApiProperty({ example: '1234567890', description: '10-digit National ID' })
  @IsNotEmpty()
  @Matches(/^[0-9]{10}$/, { message: 'nationalId must be exactly 10 digits' })
  nationalId: string;

  @ApiProperty({ example: 'John' })
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsNotEmpty()
  @IsString()
  lastName: string;

  @ApiProperty({ example: 'admin' })
  @IsNotEmpty()
  @IsString()
  username: string;

  @ApiProperty({ example: 'SecurePassword123!' })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password: string;
}

export class LoginDto {
  @ApiProperty({ example: '1234567890', description: '10-digit National ID' })
  @IsNotEmpty()
  @Matches(/^[0-9]{10}$/, { message: 'nationalId must be exactly 10 digits' })
  nationalId: string;

  @ApiProperty({ example: 'SecurePassword123!' })
  @IsNotEmpty()
  @IsString()
  password: string;
}

export class LoginResponseDto {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  sessionId: string;

  @ApiProperty({ example: 'ADMIN', enum: ['ADMIN', 'TEACHER', 'STUDENT'] })
  role: string;

  @ApiProperty()
  user: {
    id: string;
    nationalId: string;
    firstName: string;
    lastName: string;
    username: string;
    role: string;
    accountState: string;
  };
}
