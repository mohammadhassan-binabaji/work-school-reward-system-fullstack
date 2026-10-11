import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_GUARD } from '@nestjs/core';
import { appConfig } from './config/env.config';
import { PrismaModule } from './common/prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';
import { StorageModule } from './modules/storage/storage.module';
import { CorrelationMiddleware } from './common/middleware/correlation.middleware';
import { SessionAuthGuard } from './common/guards/session-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

// Domain modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { AcademicModule } from './modules/academic/academic.module';
import { PointsModule } from './modules/points/points.module';
import { RewardsModule } from './modules/rewards/rewards.module';
import { ActivitiesModule } from './modules/activities/activities.module';
import { ProposalsModule } from './modules/proposals/proposals.module';
import { RankingsModule } from './modules/rankings/rankings.module';
import { GuidanceModule } from './modules/guidance/guidance.module';
import { ReportsModule } from './modules/reports/reports.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
    }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    PrismaModule,
    RedisModule,
    StorageModule,
    AuthModule,
    UsersModule,
    AcademicModule,
    PointsModule,
    RewardsModule,
    ActivitiesModule,
    ProposalsModule,
    RankingsModule,
    GuidanceModule,
    ReportsModule,
    NotificationsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: SessionAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationMiddleware).forRoutes('*');
  }
}
