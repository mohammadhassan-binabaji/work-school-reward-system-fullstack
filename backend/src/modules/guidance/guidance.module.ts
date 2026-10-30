import { Module } from '@nestjs/common';
import { GuidanceService } from './guidance.service';
import { GuidanceController } from './guidance.controller';
import { GuidanceCategoryController } from './guidance-category.controller';

@Module({
  providers: [GuidanceService],
  controllers: [GuidanceController, GuidanceCategoryController],
  exports: [GuidanceService],
})
export class GuidanceModule {}
