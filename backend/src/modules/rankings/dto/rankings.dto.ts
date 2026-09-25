import {
  IsNotEmpty,
  IsInt,
  Min,
  Max,
  IsString,
  MaxLength,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

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
