import {
  IsNotEmpty,
  IsString,
  MaxLength,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GuidanceCardStatus } from '@prisma/client';

export class CreateGuidanceCardDto {
  @ApiProperty({ example: 'Participate in Class Discussions' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  title: string;

  @ApiProperty({ example: 'Actively speak up and share constructive thoughts during class' })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({ example: 'chat-bubble-outline' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  logoKey: string;

  @ApiProperty({ example: '5 to 15 points' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  pointRangeLabel: string;

  @ApiPropertyOptional({ enum: GuidanceCardStatus, default: GuidanceCardStatus.ACTIVE })
  @IsOptional()
  @IsEnum(GuidanceCardStatus)
  status?: GuidanceCardStatus;
}

export class UpdateGuidanceCardDto {
  @ApiPropertyOptional({ example: 'Participate in Class Discussions (Updated)' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  logoKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  pointRangeLabel?: string;

  @ApiPropertyOptional({ enum: GuidanceCardStatus })
  @IsOptional()
  @IsEnum(GuidanceCardStatus)
  status?: GuidanceCardStatus;
}
