import { Module } from '@nestjs/common';
import { PointsService } from './points.service';
import { PointsController } from './points.controller';
import { AuditLogService } from './audit-log.service';

@Module({
  providers: [PointsService, AuditLogService],
  controllers: [PointsController],
  exports: [PointsService, AuditLogService],
})
export class PointsModule {}
