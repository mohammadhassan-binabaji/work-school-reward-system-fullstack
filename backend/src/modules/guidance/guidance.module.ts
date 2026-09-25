import { Module } from '@nestjs/common';
import { GuidanceService } from './guidance.service';
import { GuidanceController } from './guidance.controller';

@Module({
  providers: [GuidanceService],
  controllers: [GuidanceController],
  exports: [GuidanceService],
})
export class GuidanceModule {}
