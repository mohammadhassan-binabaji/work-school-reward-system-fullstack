import { ApiProperty } from '@nestjs/swagger';

export class UnreadCountResponseDto {
  @ApiProperty({ example: 4, minimum: 0 })
  unreadCount: number;
}
