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
  @Get('students/:id/balance-history')
  @ApiOperation({ summary: 'Get student balance snapshot history for charts' })
  async getStudentBalanceHistory(
    @Param('id', ParseUUIDPipe) studentId: string,
    @Query('days') days?: number,
    @CurrentUser() user?: { id: string; role: Role },
  ) {
    return this.rankingsService.getStudentBalanceHistory(studentId, user!, days ? Number(days) : 7);
  }

  @Roles('ADMIN')
  @Post('snapshots/trigger')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually trigger daily balance snapshot job (Admin only)' })
  async triggerDailySnapshot() {
    return this.snapshotService.takeDailySnapshot();
  }
}
