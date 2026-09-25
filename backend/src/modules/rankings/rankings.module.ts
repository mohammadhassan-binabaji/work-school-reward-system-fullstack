import { Module } from '@nestjs/common';
import { RankingsService } from './rankings.service';
import { DailySnapshotService } from './daily-snapshot.service';
import { RankingsController } from './rankings.controller';
import { TiersController } from './tiers.controller';

@Module({
  providers: [RankingsService, DailySnapshotService],
  controllers: [RankingsController, TiersController],
  exports: [RankingsService, DailySnapshotService],
})
export class RankingsModule {}
