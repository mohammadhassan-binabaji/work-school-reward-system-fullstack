import {
  IsNotEmpty,
  Matches,
  IsString,
  IsEnum,
  IsOptional,
  MaxLength,
  MinLength,
  IsUUID,
  IsBoolean,
} from 'class-validator';
import { Transform } from 'class-transformer';
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

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Alice' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Smith' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({ example: 'NewPassword123!' })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @ApiPropertyOptional({ enum: AccountState, example: AccountState.ACTIVE })
  @IsOptional()
  @IsEnum(AccountState)
  accountState?: AccountState;

  @ApiPropertyOptional({ description: 'Class ID if student', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  classId?: string;

  @ApiPropertyOptional({ description: 'Set to true to remove existing profile image' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  removeImage?: boolean;
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

  @ApiPropertyOptional({ example: '/uploads/avatar.png' })
  imageUrl?: string | null;

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

export class BulkImportErrorItemDto {
  @ApiProperty({ example: 2, description: '1-based Excel row number' })
  row: number;

  @ApiProperty({ example: 'nationalId' })
  field: string;

  @ApiProperty({ example: 'کد ملی باید دقیقاً ۱۰ رقم باشد' })
  message: string;

  @ApiPropertyOptional({ example: '123' })
  value?: string;
}

export class BulkImportResultDto {
  @ApiProperty({ example: 25 })
  count: number;

  @ApiProperty({ example: '۲۵ دانش‌آموز با موفقیت ثبت شدند' })
  message: string;

  @ApiProperty({ type: [UserResponseDto] })
  importedUsers: UserResponseDto[];
}
