import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiCookieAuth } from '@nestjs/swagger';
import { RankingsService } from './rankings.service';
import { DailySnapshotService } from './daily-snapshot.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@ApiTags('rankings')
@ApiBearerAuth()
@ApiCookieAuth()
@Controller('api/v1/rankings')
export class RankingsController {
  constructor(
    private rankingsService: RankingsService,
    private snapshotService: DailySnapshotService,
  ) {}

  @Roles('ADMIN', 'TEACHER', 'STUDENT')
  @Get('class/:id')
  @ApiOperation({ summary: 'Get class rankings with standard competition ranking' })
  async getClassRankings(
    @Param('id', ParseUUIDPipe) classId: string,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.rankingsService.getClassRankings(classId, user);
  }

  @Roles('ADMIN', 'TEACHER', 'STUDENT')
  @Get('school')
  @ApiOperation({ summary: 'Get school-wide rankings' })
  async getSchoolRankings(@CurrentUser() user: { id: string; role: Role }) {
    return this.rankingsService.getSchoolRankings(user);
  }

  @Roles('ADMIN', 'TEACHER', 'STUDENT')
  @Get('students/:id/snapshot-history')
  @ApiOperation({ summary: 'Get student daily snapshot history (balance + school/class ranks) for charts' })
  async getStudentSnapshotHistory(
    @Param('id', ParseUUIDPipe) studentId: string,
    @Query('days') days?: number,
    @CurrentUser() user?: { id: string; role: Role },
  ) {
    return this.rankingsService.getStudentSnapshotHistory(studentId, user!, days ? Number(days) : 7);
  }

  @Roles('ADMIN', 'TEACHER', 'STUDENT')
  @Get('students/:id/balance-history')
  @ApiOperation({ summary: 'Get student daily balance history (date + balance only) with cursor pagination' })
  async getStudentBalanceHistory(
    @Param('id', ParseUUIDPipe) studentId: string,
    @Query('limit') limit?: number,
    @Query('beforeDate') beforeDate?: string,
    @CurrentUser() user?: { id: string; role: Role },
  ) {
    return this.rankingsService.getStudentBalanceHistory(
      studentId,
      user!,
      limit ? Math.min(Math.max(Number(limit), 1), 60) : 14,
      beforeDate,
    );
  }

  @Roles('ADMIN')
  @Post('snapshots/trigger')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually trigger daily snapshot job — records balance + school/class ranks (Admin only)' })
  async triggerDailySnapshot() {
    return this.snapshotService.takeDailySnapshot();
  }
}
