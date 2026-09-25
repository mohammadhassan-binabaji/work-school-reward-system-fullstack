import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiCookieAuth } from '@nestjs/swagger';
import { ActivitiesService } from './activities.service';
import { RejectVerificationDto } from './dto/activities.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestWithCorrelation } from '../../common/middleware/correlation.middleware';
import { Role, VerificationStatus } from '@prisma/client';

@ApiTags('verifications')
@ApiBearerAuth()
@ApiCookieAuth()
@Controller('api/v1/verifications')
export class VerificationsController {
  constructor(private activitiesService: ActivitiesService) {}

  @Roles('ADMIN', 'STUDENT')
  @Get()
  @ApiOperation({ summary: 'List verification submissions' })
  async findAllVerifications(
    @Query('activityId') activityId?: string,
    @Query('studentId') studentId?: string,
    @Query('status') status?: VerificationStatus,
    @CurrentUser() user?: { id: string; role: Role },
  ) {
    return this.activitiesService.findAllVerifications({
      activityId,
      studentId,
      status,
      currentUser: user!,
    });
  }

  @Roles('ADMIN', 'STUDENT')
  @Get(':id')
  @ApiOperation({ summary: 'Get verification submission by ID' })
  async findVerificationById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user?: { id: string; role: Role },
  ) {
    return this.activitiesService.findVerificationById(id, user!);
  }

  @Roles('ADMIN')
  @Post(':id/review')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin reviews verification submission (OpenAPI contract endpoint)' })
  async reviewVerification(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { action: 'ACCEPT' | 'REJECT'; rejectionReason?: string },
    @CurrentUser('id') adminId: string,
    @Req() req: RequestWithCorrelation,
  ) {
    if (dto.action === 'ACCEPT') {
      return this.activitiesService.acceptVerification(id, adminId, req.correlationId || '');
    } else {
      return this.activitiesService.rejectVerification(id, { rejectionReason: dto.rejectionReason }, adminId);
    }
  }

  @Roles('ADMIN')
  @Post(':id/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin accepts verification and awards points (Admin only)' })
  async acceptVerification(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') adminId: string,
    @Req() req: RequestWithCorrelation,
  ) {
    return this.activitiesService.acceptVerification(id, adminId, req.correlationId || '');
  }

  @Roles('ADMIN')
  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin rejects verification and tracks ban counters (Admin only)' })
  async rejectVerification(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectVerificationDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.activitiesService.rejectVerification(id, dto, adminId);
  }
}
