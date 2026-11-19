import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, ArrayUnique, IsArray, IsString, IsUUID, MaxLength } from 'class-validator';

export class SendCustomNotificationDto {
  @ApiProperty({ description: 'Active student and/or teacher user IDs', type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  recipientIds: string[];

  @ApiProperty({ maxLength: 200 })
  @IsString()
  @MaxLength(200)
  subject: string;

  @ApiProperty()
  @IsString()
  body: string;
}
