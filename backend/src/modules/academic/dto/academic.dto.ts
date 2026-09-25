import { IsNotEmpty, IsString, MaxLength, IsOptional, IsUUID, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClassDto {
  @ApiProperty({ example: 'Class 7A' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'Grade 7' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  gradeLevel?: string;

  @ApiPropertyOptional({ example: 'Homeroom 7A' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateClassDto {
  @ApiPropertyOptional({ example: 'Class 7A Revised' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'Grade 7' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  gradeLevel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateSubjectDto {
  @ApiProperty({ example: 'Mathematics' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'Middle school math curriculum' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateSubjectDto {
  @ApiPropertyOptional({ example: 'Advanced Mathematics' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateAssignmentDto {
  @ApiProperty({ format: 'uuid' })
  @IsNotEmpty()
  @IsUUID()
  teacherId: string;

  @ApiProperty({ format: 'uuid' })
  @IsNotEmpty()
  @IsUUID()
  classId: string;

  @ApiProperty({ format: 'uuid' })
  @IsNotEmpty()
  @IsUUID()
  subjectId: string;
}

export class AssignStudentClassDto {
  @ApiProperty({ format: 'uuid' })
  @IsNotEmpty()
  @IsUUID()
  studentId: string;

  @ApiProperty({ format: 'uuid' })
  @IsNotEmpty()
  @IsUUID()
  classId: string;
}
