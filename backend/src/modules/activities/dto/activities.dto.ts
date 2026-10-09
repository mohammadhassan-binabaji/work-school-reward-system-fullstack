import {
  IsNotEmpty,
  IsEnum,
  IsString,
  MaxLength,
  IsInt,
  Min,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ActivityType, ActivityStatus, VerificationStatus } from '@prisma/client';

export class ActivityResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ enum: ActivityType })
  type: ActivityType;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  pointValue: number;

  @ApiProperty()
  completionLimit: number;

  @ApiProperty({ enum: ActivityStatus })
  status: ActivityStatus;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Number of approved completions for the student' })
  completionCount?: number;

  @ApiPropertyOptional({ description: 'Whether the student is banned from this activity' })
  isBanned?: boolean;

  @ApiPropertyOptional({ description: 'Whether the student has reached the completion limit' })
  isDone?: boolean;

  @ApiPropertyOptional({
    enum: VerificationStatus,
    nullable: true,
    description: 'Latest verification status for this student on this activity',
  })
  verificationStatus?: VerificationStatus | null;
}

export class CreateActivityDto {
  @ApiProperty({ enum: ActivityType, example: ActivityType.CHALLENGE })
  @IsNotEmpty()
  @IsEnum(ActivityType)
  type: ActivityType;

  @ApiProperty({ example: 'Science Fair Project' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  title: string;

  @ApiProperty({ example: 'Submit hypothesis and photo of the working prototype' })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({ example: 50, minimum: 1, description: 'Immutable fixed point reward' })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  pointValue: number;

  @ApiProperty({ example: 1, minimum: 1, description: 'Max completions allowed per student' })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  completionLimit: number;

  @ApiPropertyOptional({ enum: ActivityStatus, default: ActivityStatus.ACTIVE })
  @IsOptional()
  @IsEnum(ActivityStatus)
  status?: ActivityStatus;
}

export class UpdateActivityMetadataDto {
  @ApiPropertyOptional({ example: 'Science Fair Project (Updated)' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  completionLimit?: number;

  @ApiPropertyOptional({ enum: ActivityStatus })
  @IsOptional()
  @IsEnum(ActivityStatus)
  status?: ActivityStatus;
}

export class SubmitVerificationDto {
  @ApiProperty({ example: 'Here is my submission and proof' })
  @IsNotEmpty()
  @IsString()
  textDescription: string;

  @ApiPropertyOptional({ example: '/uploads/evidence/prototype.jpg' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  fileAttachmentUrl?: string;
}

export class RejectVerificationDto {
  @ApiPropertyOptional({ example: 'The submitted photo was incomplete' })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

export class ReviewVerificationDto {
  @ApiProperty({ enum: ['ACCEPT', 'REJECT'], example: 'ACCEPT' })
  @IsNotEmpty()
  @IsEnum(['ACCEPT', 'REJECT'])
  action: 'ACCEPT' | 'REJECT';

  @ApiPropertyOptional({ example: 'The submitted photo was incomplete' })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

export class UnbanStudentDto {
  @ApiProperty({ format: 'uuid', description: 'Activity ID to unban student from' })
  @IsNotEmpty()
  @IsUUID()
  activityId: string;
}
