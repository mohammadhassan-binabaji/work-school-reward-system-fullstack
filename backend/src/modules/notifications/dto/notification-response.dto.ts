import { ApiProperty } from '@nestjs/swagger';
import { NotificationReadStatus, OriginatingEntityType } from '@prisma/client';

export class NotificationResponseDto {
  @ApiProperty({ example: 'a8098c1a-f86e-11da-bd1a-00112444be1e' })
  id: string;

  @ApiProperty({ example: '6ba7b810-9dad-11d1-80b4-00c04fd430c8' })
  recipientId: string;

  @ApiProperty({ example: 'Points Awarded', maxLength: 200 })
  subject: string;

  @ApiProperty({
    example: "Teacher Sarah Jenkins awarded you 25 points for task 'Math Quiz Excellence'.",
  })
  body: string;

  @ApiProperty({ enum: NotificationReadStatus, example: 'UNREAD' })
  readStatus: NotificationReadStatus;

  @ApiProperty({ nullable: true, example: null })
  readAt: Date | null;

  @ApiProperty({ enum: OriginatingEntityType, example: 'POINT_AWARD' })
  originatingEntityType: OriginatingEntityType;

  @ApiProperty({ example: '7c9e6679-7425-40de-944b-e07fc1f90ae7' })
  originatingEntityId: string;

  @ApiProperty({ example: '2026-10-09T14:30:00.000Z' })
  createdAt: Date;
}
