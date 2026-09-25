import {
  IsNotEmpty,
  IsString,
  MaxLength,
  IsOptional,
  IsInt,
  Min,
  IsBoolean,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRewardDto {
  @ApiProperty({ example: 'Sticker Pack' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  name: string;

  @ApiProperty({ example: 'Cool vinyl stickers' })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiPropertyOptional({ example: '/uploads/stickers.png' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;

  @ApiProperty({ example: 10, minimum: 1 })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  pointPrice: number;

  @ApiProperty({ example: false })
  @IsNotEmpty()
  @IsBoolean()
  requiresApproval: boolean;

  @ApiPropertyOptional({
    example: 20,
    minimum: 0,
    description: 'Finite inventory for non-approval rewards',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  inventoryQuantity?: number;
}

export class UpdateRewardMetadataDto {
  @ApiPropertyOptional({ example: 'Sticker Pack (New edition)' })
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
  @IsString()
  @MaxLength(500)
  imageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  inventoryQuantity?: number;
}

export class CreateRewardRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsNotEmpty()
  @IsUUID()
  rewardId: string;
}

export class DeclineRewardRequestDto {
  @ApiPropertyOptional({ example: 'Item out of stock or ineligible' })
  @IsOptional()
  @IsString()
  declineReason?: string;
}
