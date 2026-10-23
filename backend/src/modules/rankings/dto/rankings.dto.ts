import {
  IsNotEmpty,
  IsInt,
  Min,
  Max,
  IsString,
  MaxLength,
  IsArray,
  IsOptional,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TierItemDto {
  @ApiProperty({ example: 1, minimum: 1, maximum: 5 })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Max(5)
  tierNumber: number;

  @ApiProperty({ example: 'Bronze' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 0, minimum: 0 })
  @IsNotEmpty()
  @IsInt()
  @Min(0)
  minPointsThreshold: number;

  @ApiPropertyOptional({ example: 'bronze_ember', description: 'Pre-defined theme ID' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  themeId?: string;

  @ApiPropertyOptional({
    example: ['فوق‌العاده‌ای! به تلاشت ادامه بده...'],
    description: 'Custom motivational messages for this tier',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  motivationalMessages?: string[];
}

export class UpdateTierConfigurationsDto {
  @ApiProperty({
    type: [TierItemDto],
    description: 'Must provide exactly 5 tiers (tierNumber 1 to 5)',
  })
  @IsArray()
  @ArrayMinSize(5)
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => TierItemDto)
  tiers: TierItemDto[];
}

export class DailyStudentSnapshotDto {
  @ApiProperty({ description: 'Student profile ID', format: 'uuid' })
  studentId: string;

  @ApiProperty({ description: 'Point balance at snapshot time', example: 250 })
  balance: number;

  @ApiProperty({
    description: 'School-wide rank at snapshot time (standard competition ranking)',
    example: 3,
  })
  schoolRank: number;

  @ApiPropertyOptional({
    description:
      "Rank within the student's class at snapshot time. Null if student has no class assigned.",
    example: 1,
    nullable: true,
  })
  classRank: number | null;

  @ApiProperty({ description: 'Date of the snapshot (UTC midnight)', format: 'date' })
  snapshotDate: Date;

  @ApiProperty({ description: 'Record creation timestamp', format: 'date-time' })
  createdAt: Date;
}
