import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiCookieAuth } from '@nestjs/swagger';
import { ProposalsService } from './proposals.service';
import {
  CreateProposalDto,
  ApproveProposalDto,
  UpdateProposalPointsDto,
  DeclineProposalDto,
  CreateProposalMessageDto,
} from './dto/proposals.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestWithCorrelation } from '../../common/middleware/correlation.middleware';
import { Role, ProposalStatus } from '@prisma/client';

@ApiTags('proposals')
@ApiBearerAuth()
@ApiCookieAuth()
@Controller('api/v1/proposals')
export class ProposalsController {
  constructor(private proposalsService: ProposalsService) {}

  @Roles('STUDENT')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit voluntary task proposal (Student only)' })
  async createProposal(@Body() dto: CreateProposalDto, @CurrentUser('id') studentId: string) {
    return this.proposalsService.createProposal(dto, studentId);
  }

  @Roles('ADMIN', 'STUDENT')
  @Get()
  @ApiOperation({ summary: 'Query task proposals (Admin sees school-wide, Student sees own)' })
  async findAllProposals(
    @Query('studentId') studentId?: string,
    @Query('status') status?: ProposalStatus,
    @CurrentUser() user?: { id: string; role: Role },
  ) {
    return this.proposalsService.findAllProposals({
      studentId,
      status,
      currentUser: user!,
    });
  }

  @Roles('ADMIN', 'STUDENT')
  @Get(':id')
  @ApiOperation({ summary: 'Get task proposal by ID' })
  async findProposalById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user?: { id: string; role: Role },
  ) {
    return this.proposalsService.findProposalById(id, user!);
  }

  @Roles('ADMIN')
  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin approves proposal and sets point value (Admin only)' })
  async approveProposal(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveProposalDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.proposalsService.approveProposal(id, dto, adminId);
  }

  @Roles('ADMIN')
  @Patch(':id/points')
  @ApiOperation({ summary: 'Admin updates point value while in READY_TO_DO (Admin only)' })
  async updateProposalPoints(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProposalPointsDto,
  ) {
    return this.proposalsService.updateProposalPoints(id, dto);
  }

  @Roles('ADMIN')
  @Post(':id/decline')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin declines proposal (Admin only)' })
  async declineProposal(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DeclineProposalDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.proposalsService.declineProposal(id, dto, adminId);
  }

  @Roles('STUDENT')
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Student cancels proposal strictly in READY_TO_DO (Student only)' })
  async cancelProposal(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') studentId: string,
  ) {
    return this.proposalsService.cancelProposal(id, studentId);
  }

  @Roles('ADMIN')
  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin marks proposal completed and awards points (Admin only)' })
  async completeProposal(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') adminId: string,
    @Req() req: RequestWithCorrelation,
  ) {
    return this.proposalsService.completeProposal(id, adminId, req.correlationId || '');
  }

  @Roles('ADMIN', 'STUDENT')
  @Post(':id/messages')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Post in-request message to proposal thread (Admin and Student only)' })
  async createMessage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateProposalMessageDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.proposalsService.createProposalMessage(id, dto, user);
  }

  @Roles('ADMIN', 'STUDENT')
  @Get(':id/messages')
  @ApiOperation({ summary: 'Get in-request message thread for proposal' })
  async getMessages(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.proposalsService.getProposalMessages(id, user);
  }
}
