import {
  IsNotEmpty,
  IsString,
  MaxLength,
  IsOptional,
  IsUUID,
  IsInt,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateGuidanceCategoryDto {
  @ApiProperty({ example: 'فعالیت‌های آموزشی' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  title: string;

  @ApiPropertyOptional({ example: 'graduation-cap' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  iconKey?: string;

  @ApiPropertyOptional({ example: 1, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateGuidanceCategoryDto {
  @ApiPropertyOptional({ example: 'فعالیت‌های آموزشی و پژوهشی' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  title?: string;

  @ApiPropertyOptional({ example: 'graduation-cap' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  iconKey?: string;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CreateGuidanceCardDto {
  @ApiProperty({ example: 'a0000000-0000-0000-0000-000000000001' })
  @IsNotEmpty()
  @IsUUID()
  categoryId: string;

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

  @ApiPropertyOptional({ example: 1, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateGuidanceCardDto {
  @ApiPropertyOptional({ example: 'a0000000-0000-0000-0000-000000000001' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

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

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
