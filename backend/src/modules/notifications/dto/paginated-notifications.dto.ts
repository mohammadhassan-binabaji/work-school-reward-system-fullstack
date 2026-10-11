import { ApiProperty } from '@nestjs/swagger';
import { NotificationResponseDto } from './notification-response.dto';

export class PaginationMetaDto {
  @ApiProperty({ example: 45 })
  totalItems: number;

  @ApiProperty({ example: 20 })
  itemCount: number;

  @ApiProperty({ example: 20 })
  itemsPerPage: number;

  @ApiProperty({ example: 3 })
  totalPages: number;

  @ApiProperty({ example: 1 })
  currentPage: number;
}

export class PaginatedNotificationsDto {
  @ApiProperty({ type: [NotificationResponseDto] })
  data: NotificationResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
