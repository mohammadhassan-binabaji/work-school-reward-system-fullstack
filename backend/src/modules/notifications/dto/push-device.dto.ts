import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class PushDeviceDto {
  @ApiProperty({ description: 'FCM registration token for this Android installation' })
  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  token: string;
}
