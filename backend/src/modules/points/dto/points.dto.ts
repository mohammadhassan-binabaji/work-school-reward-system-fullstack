import {
  IsNotEmpty,
  IsUUID,
  IsInt,
  Min,
  IsString,
  MaxLength,
  IsOptional,
  IsArray,
  ValidateNested,
  NotEquals,
  ArrayMinSize,
  ArrayUnique,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FundTeacherBudgetDto {
  @ApiProperty({ format: 'uuid' })
  @IsNotEmpty()
  @IsUUID()
  teacherId: string;

  @ApiProperty({ example: 100, minimum: 1 })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  amount: number;
}

export class FundVicePrincipalBudgetDto {
  @ApiProperty({ format: 'uuid' })
  @IsNotEmpty()
  @IsUUID()
  vicePrincipalId: string;

  @ApiProperty({ example: 100, minimum: 1 })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  amount: number;
}

export class CreatePointTaskOptionDto {
  @ApiProperty({ example: 10, minimum: 1 })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  points: number;

  @ApiPropertyOptional({ example: 'Excellent Effort' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string;
}

export class CreatePointTaskDto {
  @ApiProperty({ example: 'Doing Homework' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  name: string;

  @ApiPropertyOptional({ example: 'Complete homework assignments on time' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ type: [CreatePointTaskOptionDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePointTaskOptionDto)
  options: CreatePointTaskOptionDto[];
}

export class UpdatePointTaskDto {
  @ApiPropertyOptional({ example: 'Doing Homework Revised' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  isActive?: boolean;
}

export class TeacherAwardPointsDto {
  @ApiProperty({ format: 'uuid' })
  @IsNotEmpty()
  @IsUUID()
  studentId: string;

  @ApiProperty({ format: 'uuid' })
  @IsNotEmpty()
  @IsUUID()
  classId: string;

  @ApiProperty({ format: 'uuid' })
  @IsNotEmpty()
  @IsUUID()
  subjectId: string;

  @ApiProperty({ example: 10, minimum: 1, description: 'Points to award to student' })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  amount: number;

  @ApiProperty({ example: 'مشارکت فعال در درس ریاضی', maxLength: 150 })
  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  reason: string;

  @ApiPropertyOptional({ example: 'پاسخ صحیح به تمرین صفحه ۲۵', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class TeacherBulkAwardPointsDto {
  @ApiProperty({ type: [String], format: 'uuid' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  studentIds: string[];

  @ApiProperty({ format: 'uuid' })
  @IsNotEmpty()
  @IsUUID()
  classId: string;

  @ApiProperty({ format: 'uuid' })
  @IsNotEmpty()
  @IsUUID()
  subjectId: string;

  @ApiProperty({ example: 10, minimum: 1, description: 'Points awarded to each student' })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  amount: number;

  @ApiProperty({ example: 'مشارکت فعال در درس ریاضی', maxLength: 150 })
  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  reason: string;

  @ApiPropertyOptional({ example: 'پاسخ صحیح به تمرین صفحه ۲۵', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class AdminAdjustStudentBalanceDto {
  @ApiProperty({ format: 'uuid' })
  @IsNotEmpty()
  @IsUUID()
  studentId: string;

  @ApiProperty({ example: 20, description: 'Positive to credit, negative to debit' })
  @IsNotEmpty()
  @IsInt()
  @NotEquals(0)
  amount: number;

  @ApiProperty({ example: 'Correction for grading error' })
  @IsNotEmpty()
  @IsString()
  reason: string;
}

export class AdminBulkAdjustStudentBalanceDto {
  @ApiProperty({ type: [String], format: 'uuid' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  studentIds: string[];

  @ApiProperty({ example: 20, description: 'Positive to credit, negative to debit each student' })
  @IsNotEmpty()
  @IsInt()
  @NotEquals(0)
  amount: number;

  @ApiProperty({ example: 'Correction for grading error' })
  @IsNotEmpty()
  @IsString()
  reason: string;
}

export class ViceAdjustStudentBalanceDto {
  @ApiProperty({ format: 'uuid' })
  @IsNotEmpty()
  @IsUUID()
  studentId: string;

  @ApiProperty({
    example: 20,
    description:
      'Positive to credit student (debits VP balance), negative to debit student (credits VP balance)',
  })
  @IsNotEmpty()
  @IsInt()
  @NotEquals(0)
  amount: number;

  @ApiProperty({ example: 'Correction or direct vice principal adjustment' })
  @IsNotEmpty()
  @IsString()
  reason: string;
}

export class ViceBulkAdjustStudentBalanceDto {
  @ApiProperty({ type: [String], format: 'uuid' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  studentIds: string[];

  @ApiProperty({
    example: 20,
    description:
      'Positive to credit each student (debits VP balance), negative to debit each student (credits VP balance)',
  })
  @IsNotEmpty()
  @IsInt()
  @NotEquals(0)
  amount: number;

  @ApiProperty({ example: 'Correction or direct vice principal adjustment' })
  @IsNotEmpty()
  @IsString()
  reason: string;
}

export class SetPoolBalanceDto {
  @ApiProperty({ example: 10000, minimum: 0 })
  @IsNotEmpty()
  @IsInt()
  @Min(0)
  balance: number;
}
