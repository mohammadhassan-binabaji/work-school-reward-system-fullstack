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

  @Roles('ADMIN', 'STUDENT', 'VICE_PRINCIPAL')
  @Get()
  @ApiOperation({ summary: 'Query task proposals (Admin/VP sees school-wide, Student sees own)' })
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

  @Roles('ADMIN', 'STUDENT', 'VICE_PRINCIPAL')
  @Get(':id')
  @ApiOperation({ summary: 'Get task proposal by ID' })
  async findProposalById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user?: { id: string; role: Role },
  ) {
    return this.proposalsService.findProposalById(id, user!);
  }

  @Roles('ADMIN', 'VICE_PRINCIPAL')
  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin or VP approves proposal and sets point value' })
  async approveProposal(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveProposalDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.proposalsService.approveProposal(id, dto, adminId);
  }

  @Roles('ADMIN', 'VICE_PRINCIPAL')
  @Patch(':id/points')
  @ApiOperation({ summary: 'Admin or VP updates point value while in READY_TO_DO' })
  async updateProposalPoints(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProposalPointsDto,
  ) {
    return this.proposalsService.updateProposalPoints(id, dto);
  }

  @Roles('ADMIN', 'VICE_PRINCIPAL')
  @Post(':id/decline')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin or VP declines proposal' })
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

  @Roles('ADMIN', 'VICE_PRINCIPAL')
  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin or VP marks proposal completed and awards points' })
  async completeProposal(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; role: Role },
    @Req() req: RequestWithCorrelation,
  ) {
    return this.proposalsService.completeProposal(
      id,
      user.id,
      req.correlationId || '',
      user.role,
    );
  }

  @Roles('ADMIN', 'STUDENT', 'VICE_PRINCIPAL')
  @Post(':id/messages')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Post in-request message to proposal thread (Admin, VP, and Student only)' })
  async createMessage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateProposalMessageDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.proposalsService.createProposalMessage(id, dto, user);
  }

  @Roles('ADMIN', 'STUDENT', 'VICE_PRINCIPAL')
  @Get(':id/messages')
  @ApiOperation({ summary: 'Get in-request message thread for proposal' })
  async getMessages(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.proposalsService.getProposalMessages(id, user);
  }
}
