import { ApiProperty } from '@nestjs/swagger';

export class BulkReadResponseDto {
  @ApiProperty({ example: 7, minimum: 0 })
  updatedCount: number;
}
