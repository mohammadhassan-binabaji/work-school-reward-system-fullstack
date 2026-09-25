import { Module } from '@nestjs/common';
import { RewardsService } from './rewards.service';
import { RewardsController } from './rewards.controller';
import { RewardRequestsController } from './reward-requests.controller';
import { PointsModule } from '../points/points.module';

@Module({
  imports: [PointsModule],
  providers: [RewardsService],
  controllers: [RewardsController, RewardRequestsController],
  exports: [RewardsService],
})
export class RewardsModule {}
