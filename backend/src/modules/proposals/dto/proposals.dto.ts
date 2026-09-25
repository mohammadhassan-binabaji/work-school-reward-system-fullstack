import {
  IsNotEmpty,
  IsString,
  IsInt,
  Min,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProposalDto {
  @ApiProperty({ example: 'Planting new trees in the school yard' })
  @IsNotEmpty()
  @IsString()
  description: string;
}

export class ApproveProposalDto {
  @ApiProperty({ example: 25, minimum: 1, description: 'Assigned positive point value' })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  assignedPointValue: number;
}

export class UpdateProposalPointsDto {
  @ApiProperty({ example: 35, minimum: 1 })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  assignedPointValue: number;
}

export class DeclineProposalDto {
  @ApiPropertyOptional({ example: 'Task not aligned with current school projects' })
  @IsOptional()
  @IsString()
  declineReason?: string;
}

export class CreateProposalMessageDto {
  @ApiProperty({ example: 'I have started preparing the soil.' })
  @IsNotEmpty()
  @IsString()
  message: string;
}
