import { Module } from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { ActivitiesController } from './activities.controller';
import { VerificationsController } from './verifications.controller';
import { StudentBanController } from './student-ban.controller';
import { PointsModule } from '../points/points.module';

@Module({
  imports: [PointsModule],
  providers: [ActivitiesService],
  controllers: [ActivitiesController, VerificationsController, StudentBanController],
  exports: [ActivitiesService],
})
export class ActivitiesModule {}
