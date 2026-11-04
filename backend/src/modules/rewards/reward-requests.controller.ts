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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiCookieAuth } from '@nestjs/swagger';
import { RewardsService } from './rewards.service';
import { CreateRewardRequestDto, DeclineRewardRequestDto } from './dto/rewards.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestWithCorrelation } from '../../common/middleware/correlation.middleware';
import { Role, RewardRequestStatus } from '@prisma/client';

@ApiTags('reward-requests')
@ApiBearerAuth()
@ApiCookieAuth()
@Controller('api/v1/reward-requests')
export class RewardRequestsController {
  constructor(private rewardsService: RewardsService) {}

  @Roles('STUDENT')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit reward redemption request (Student only)' })
  async createRequest(
    @Body() dto: CreateRewardRequestDto,
    @CurrentUser('id') studentId: string,
    @Req() req: RequestWithCorrelation,
  ) {
    return this.rewardsService.createRewardRequest(dto, studentId, req.correlationId || '');
  }

  @Roles('ADMIN', 'STUDENT', 'VICE_PRINCIPAL')
  @Get()
  @ApiOperation({ summary: 'Query reward requests' })
  async findAllRequests(
    @Query('studentId') studentId?: string,
    @Query('status') status?: RewardRequestStatus,
    @CurrentUser() user?: { id: string; role: Role },
  ) {
    return this.rewardsService.findAllRequests({
      studentId,
      status,
      currentUser: user!,
    });
  }

  @Roles('ADMIN', 'STUDENT', 'VICE_PRINCIPAL')
  @Get(':id')
  @ApiOperation({ summary: 'Get reward request by ID' })
  async findRequestById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user?: { id: string; role: Role },
  ) {
    return this.rewardsService.findRequestById(id, user!);
  }

  @Roles('ADMIN', 'VICE_PRINCIPAL')
  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin or VP approves reward request' })
  async approveRequest(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') adminId: string) {
    return this.rewardsService.approveRewardRequest(id, adminId);
  }

  @Roles('ADMIN', 'VICE_PRINCIPAL')
  @Post(':id/decline')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin or VP declines reward request with point refund' })
  async declineRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DeclineRewardRequestDto,
    @CurrentUser() user: { id: string; role: Role },
    @Req() req: RequestWithCorrelation,
  ) {
    return this.rewardsService.declineRewardRequest(
      id,
      dto,
      user.id,
      req.correlationId || '',
      user.role,
    );
  }

  @Roles('ADMIN', 'VICE_PRINCIPAL')
  @Post(':id/receive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin or VP confirms physical handover completed' })
  async receiveRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; role: Role },
    @Req() req: RequestWithCorrelation,
  ) {
    return this.rewardsService.receiveRewardRequest(
      id,
      user.id,
      req.correlationId || '',
      user.role,
    );
  }
}
