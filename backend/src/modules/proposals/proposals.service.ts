import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditLogService } from '../points/audit-log.service';
import {
  CreateProposalDto,
  ApproveProposalDto,
  UpdateProposalPointsDto,
  DeclineProposalDto,
  CreateProposalMessageDto,
} from './dto/proposals.dto';
import {
  Role,
  ProposalStatus,
  ActorRole,
  SourceType,
  RecipientType,
  ActionType,
} from '@prisma/client';

@Injectable()
export class ProposalsService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
  ) {}

  // Proposal Submission (FR-044, FR-089)
  async createProposal(dto: CreateProposalDto, studentId: string) {
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
    });

    if (!student || student.role !== Role.STUDENT) {
      throw new ForbiddenException({
        statusCode: 403,
        errorCode: 'NOT_A_STUDENT',
        message: 'Only students can submit voluntary task proposals',
      });
    }

    return this.prisma.studentTaskProposal.create({
      data: {
        studentId,
        description: dto.description,
        status: ProposalStatus.PENDING_TO_APPROVE,
      },
      include: {
        messages: true,
      },
    });
  }

  // Query Proposals with Privacy Isolation (FR-050, FR-051, FR-052, FR-053)
  async findAllProposals(filter: {
    studentId?: string;
    status?: ProposalStatus;
    currentUser: { id: string; role: Role };
  }) {
    if (filter.currentUser.role === Role.TEACHER) {
      throw new ForbiddenException({
        statusCode: 403,
        errorCode: 'TEACHER_PROPOSAL_ACCESS_FORBIDDEN',
        message: 'Teachers are strictly prohibited from viewing student task proposals',
      });
    }

    const where: any = {};
    if (filter.currentUser.role === Role.STUDENT) {
      where.studentId = filter.currentUser.id;
    } else if (filter.studentId) {
      where.studentId = filter.studentId;
    }

    if (filter.status) {
      where.status = filter.status;
    }

    return this.prisma.studentTaskProposal.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            nationalId: true,
            firstName: true,
            lastName: true,
            username: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findProposalById(id: string, currentUser: { id: string; role: Role }) {
    if (currentUser.role === Role.TEACHER) {
      throw new ForbiddenException({
        statusCode: 403,
        errorCode: 'TEACHER_PROPOSAL_ACCESS_FORBIDDEN',
        message: 'Teachers are strictly prohibited from viewing student task proposals',
      });
    }

    const proposal = await this.prisma.studentTaskProposal.findUnique({
      where: { id },
      include: {
        student: {
          select: {
            id: true,
            nationalId: true,
            firstName: true,
            lastName: true,
            username: true,
          },
        },
        messages: {
          include: {
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!proposal) {
      throw new NotFoundException({
        statusCode: 404,
        errorCode: 'PROPOSAL_NOT_FOUND',
        message: 'Task proposal not found',
      });
    }

    if (currentUser.role === Role.STUDENT && proposal.studentId !== currentUser.id) {
      throw new ForbiddenException({
        statusCode: 403,
        errorCode: 'FORBIDDEN',
        message: 'Cannot view task proposals belonging to other students',
      });
    }

    return proposal;
  }

  // Admin Approval (FR-045)
  async approveProposal(id: string, dto: ApproveProposalDto, adminId: string) {
    const proposal = await this.prisma.studentTaskProposal.findUnique({ where: { id } });
    if (!proposal) {
      throw new NotFoundException({
        statusCode: 404,
        errorCode: 'PROPOSAL_NOT_FOUND',
        message: 'Task proposal not found',
      });
    }

    if (proposal.status !== ProposalStatus.PENDING_TO_APPROVE) {
      throw new BadRequestException({
        statusCode: 400,
        errorCode: 'INVALID_PROPOSAL_STATE',
        message: `Cannot approve proposal in status ${proposal.status}. Must be PENDING_TO_APPROVE`,
      });
    }

    return this.prisma.studentTaskProposal.update({
      where: { id },
      data: {
        status: ProposalStatus.READY_TO_DO,
        assignedPointValue: dto.assignedPointValue,
        reviewedByAdminId: adminId,
        approvedAt: new Date(),
      },
      include: { messages: true },
    });
  }

  // Admin Point Value Update in READY_TO_DO (FR-046)
  async updateProposalPoints(id: string, dto: UpdateProposalPointsDto) {
    const proposal = await this.prisma.studentTaskProposal.findUnique({ where: { id } });
    if (!proposal) {
      throw new NotFoundException({
        statusCode: 404,
        errorCode: 'PROPOSAL_NOT_FOUND',
        message: 'Task proposal not found',
      });
    }

    if (proposal.status !== ProposalStatus.READY_TO_DO) {
      throw new BadRequestException({
        statusCode: 400,
        errorCode: 'INVALID_PROPOSAL_STATE',
        message: `Point values can only be modified when proposal is in READY_TO_DO status`,
      });
    }

    return this.prisma.studentTaskProposal.update({
      where: { id },
      data: { assignedPointValue: dto.assignedPointValue },
    });
  }

  // Admin Decline (FR-045)
  async declineProposal(id: string, dto: DeclineProposalDto, adminId: string) {
    const proposal = await this.prisma.studentTaskProposal.findUnique({ where: { id } });
    if (!proposal) {
      throw new NotFoundException({
        statusCode: 404,
        errorCode: 'PROPOSAL_NOT_FOUND',
        message: 'Task proposal not found',
      });
    }

    if (proposal.status !== ProposalStatus.PENDING_TO_APPROVE) {
      throw new BadRequestException({
        statusCode: 400,
        errorCode: 'INVALID_PROPOSAL_STATE',
        message: `Cannot decline proposal in status ${proposal.status}`,
      });
    }

    return this.prisma.studentTaskProposal.update({
      where: { id },
      data: {
        status: ProposalStatus.DECLINED,
        reviewedByAdminId: adminId,
        declineReason: dto.declineReason ?? null,
      },
    });
  }

  // Student Cancellation (FR-047)
  async cancelProposal(id: string, studentId: string) {
    const proposal = await this.prisma.studentTaskProposal.findUnique({ where: { id } });
    if (!proposal) {
      throw new NotFoundException({
        statusCode: 404,
        errorCode: 'PROPOSAL_NOT_FOUND',
        message: 'Task proposal not found',
      });
    }

    if (proposal.studentId !== studentId) {
      throw new ForbiddenException({
        statusCode: 403,
        errorCode: 'FORBIDDEN',
        message: 'Cannot cancel proposal of another student',
      });
    }

    if (proposal.status !== ProposalStatus.READY_TO_DO) {
      throw new BadRequestException({
        statusCode: 400,
        errorCode: 'INVALID_PROPOSAL_STATE',
        message: `Students can only cancel proposals when status is READY_TO_DO (current status: ${proposal.status})`,
      });
    }

    return this.prisma.studentTaskProposal.update({
      where: { id },
      data: { status: ProposalStatus.CANCELED },
    });
  }

  // Admin Completion & Point Award (FR-048)
  async completeProposal(id: string, adminId: string, correlationId: string) {
    const proposal = await this.prisma.studentTaskProposal.findUnique({
      where: { id },
    });

    if (!proposal) {
      throw new NotFoundException({
        statusCode: 404,
        errorCode: 'PROPOSAL_NOT_FOUND',
        message: 'Task proposal not found',
      });
    }

    if (proposal.status !== ProposalStatus.READY_TO_DO) {
      throw new BadRequestException({
        statusCode: 400,
        errorCode: 'INVALID_PROPOSAL_STATE',
        message: `Proposal must be in READY_TO_DO status to be marked completed`,
      });
    }

    const awardPoints = proposal.assignedPointValue || 0;
    if (awardPoints <= 0) {
      throw new BadRequestException({
        statusCode: 400,
        errorCode: 'INVALID_POINT_VALUE',
        message: 'Proposal does not have a positive assigned point value',
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedProposal = await tx.studentTaskProposal.update({
        where: { id },
        data: {
          status: ProposalStatus.COMPLETED,
          completedAt: new Date(),
        },
      });

      const studentProfile = await tx.studentProfile.findUnique({
        where: { id: proposal.studentId },
      });

      const newCurrentBalance = (studentProfile?.currentBalance || 0) + awardPoints;
      const newHighestBalance = Math.max(studentProfile?.highestBalance || 0, newCurrentBalance);

      const matchingTier = await tx.tierConfiguration.findFirst({
        where: { minPointsThreshold: { lte: newCurrentBalance } },
        orderBy: { minPointsThreshold: 'desc' },
      });

      await tx.studentProfile.update({
        where: { id: proposal.studentId },
        data: {
          currentBalance: newCurrentBalance,
          highestBalance: newHighestBalance,
          currentTierId: matchingTier?.id || studentProfile?.currentTierId,
        },
      });

      // Audit log
      await this.auditLogService.log(
        {
          correlationId,
          actorId: adminId,
          actorRole: ActorRole.ADMIN,
          sourceType: SourceType.SYSTEM_POOL,
          recipientType: RecipientType.STUDENT_CURRENT,
          recipientId: proposal.studentId,
          amount: awardPoints,
          actionType: ActionType.PROPOSAL_AWARD_STUDENT,
          taskOrReason: `Voluntary task completed: ${proposal.description.substring(0, 50)}`,
          relatedEntityType: 'StudentTaskProposal',
          relatedEntityId: proposal.id,
          resultingRecipientBalance: newCurrentBalance,
        },
        tx,
      );

      return updatedProposal;
    });
  }

  // In-Request Messaging (FR-049, FR-090)
  async createProposalMessage(
    proposalId: string,
    dto: CreateProposalMessageDto,
    sender: { id: string; role: Role },
  ) {
    if (sender.role === Role.TEACHER) {
      throw new ForbiddenException({
        statusCode: 403,
        errorCode: 'TEACHER_PROPOSAL_ACCESS_FORBIDDEN',
        message: 'Teachers cannot participate in student proposal message threads',
      });
    }

    const proposal = await this.prisma.studentTaskProposal.findUnique({
      where: { id: proposalId },
    });

    if (!proposal) {
      throw new NotFoundException({
        statusCode: 404,
        errorCode: 'PROPOSAL_NOT_FOUND',
        message: 'Task proposal not found',
      });
    }

    if (sender.role === Role.STUDENT && proposal.studentId !== sender.id) {
      throw new ForbiddenException({
        statusCode: 403,
        errorCode: 'FORBIDDEN',
        message: 'Cannot post message on another student proposal',
      });
    }

    const restrictedStatuses: ProposalStatus[] = [
      ProposalStatus.COMPLETED,
      ProposalStatus.DECLINED,
      ProposalStatus.CANCELED,
    ];
    if (sender.role === Role.STUDENT && restrictedStatuses.includes(proposal.status)) {
      throw new BadRequestException({
        statusCode: 400,
        errorCode: 'INVALID_PROPOSAL_STATE',
        message: `Students cannot send messages when proposal status is ${proposal.status}`,
      });
    }

    return this.prisma.taskProposalMessage.create({
      data: {
        proposalId,
        senderId: sender.id,
        senderRole: sender.role,
        message: dto.message,
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });
  }

  async getProposalMessages(proposalId: string, currentUser: { id: string; role: Role }) {
    await this.findProposalById(proposalId, currentUser);
    return this.prisma.taskProposalMessage.findMany({
      where: { proposalId },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
