import {
  IsNotEmpty,
  Matches,
  IsString,
  IsEnum,
  IsOptional,
  MaxLength,
  MinLength,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role, AccountState } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({ example: '1234567890', description: '10-digit National ID' })
  @IsNotEmpty()
  @Matches(/^[0-9]{10}$/, { message: 'nationalId must be exactly 10 digits' })
  nationalId: string;

  @ApiProperty({ example: 'Alice' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Smith' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  lastName: string;

  @ApiProperty({ example: 'alice.smith' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  username: string;

  @ApiProperty({ example: 'InitialPassword123!' })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ enum: Role, example: Role.STUDENT })
  @IsNotEmpty()
  @IsEnum(Role)
  role: Role;

  @ApiPropertyOptional({ enum: AccountState, default: AccountState.ACTIVE })
  @IsOptional()
  @IsEnum(AccountState)
  accountState?: AccountState;

  @ApiPropertyOptional({ description: 'Class ID if student', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  classId?: string;
}

export class UpdateUserStateDto {
  @ApiProperty({ enum: AccountState, example: AccountState.DEACTIVATED })
  @IsNotEmpty()
  @IsEnum(AccountState)
  accountState: AccountState;
}

export class UserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  nationalId: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  username: string;

  @ApiProperty({ enum: Role })
  role: Role;

  @ApiProperty({ enum: AccountState })
  accountState: AccountState;

  @ApiPropertyOptional()
  teacherProfile?: {
    pointBalance: number;
  };

  @ApiPropertyOptional()
  studentProfile?: {
    classId?: string | null;
    currentBalance: number;
    reservedBalance: number;
    highestBalance: number;
    currentTierId?: string | null;
  };

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
