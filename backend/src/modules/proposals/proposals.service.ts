import { Prisma } from '@prisma/client';
import { prisma } from '../../core/prisma.js';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError
} from '../../core/errors.js';
import {
  CreateProposalInput,
  ApproveProposalInput,
  UpdateProposalPointsInput,
  PostProposalMessageInput
} from './proposals.schemas.js';

export class ProposalsService {
  static async createProposal(studentId: string, input: CreateProposalInput) {
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) throw new NotFoundError('Student not found');
    if (student.accountState !== 'Active') {
      throw new BadRequestError('Cannot submit proposal with non-active account');
    }

    return prisma.studentTaskProposal.create({
      data: {
        studentId,
        description: input.description,
        status: 'Pending to Approve'
      }
    });
  }

  static async getProposals(role: string, userId: string) {
    if (role === 'TEACHER') {
      throw new ForbiddenError('Teachers are strictly excluded from accessing student task proposals');
    }

    return prisma.studentTaskProposal.findMany({
      where: {
        ...(role === 'STUDENT' ? { studentId: userId } : {})
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, username: true } },
        reviewer: { select: { id: true, firstName: true, lastName: true, username: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async getProposalById(id: string, role: string, userId: string) {
    if (role === 'TEACHER') {
      throw new ForbiddenError('Teachers are strictly excluded from accessing student task proposals');
    }

    const proposal = await prisma.studentTaskProposal.findUnique({
      where: { id },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, username: true } },
        reviewer: { select: { id: true, firstName: true, lastName: true, username: true } },
        messages: { orderBy: { createdAt: 'asc' } }
      }
    });

    if (!proposal) throw new NotFoundError('Proposal not found');

    if (role === 'STUDENT' && proposal.studentId !== userId) {
      throw new ForbiddenError('Access denied. You can only access your own proposals');
    }

    return proposal;
  }

  static async approveProposal(id: string, adminId: string, input: ApproveProposalInput) {
    const proposal = await prisma.studentTaskProposal.findUnique({ where: { id } });
    if (!proposal) throw new NotFoundError('Proposal not found');

    if (proposal.status !== 'Pending to Approve') {
      throw new BadRequestError(`Cannot approve proposal in status "${proposal.status}"`);
    }

    return prisma.studentTaskProposal.update({
      where: { id },
      data: {
        status: 'Ready to Do',
        assignedPointValue: input.assignedPointValue,
        reviewerId: adminId,
        approvedAt: new Date()
      }
    });
  }

  static async updatePoints(id: string, input: UpdateProposalPointsInput) {
    const proposal = await prisma.studentTaskProposal.findUnique({ where: { id } });
    if (!proposal) throw new NotFoundError('Proposal not found');

    if (proposal.status !== 'Ready to Do') {
      throw new BadRequestError('Can only update assigned point value while proposal is in Ready to Do status');
    }

    return prisma.studentTaskProposal.update({
      where: { id },
      data: {
        assignedPointValue: input.assignedPointValue
      }
    });
  }

  static async cancelProposal(id: string, studentId: string) {
    const proposal = await prisma.studentTaskProposal.findUnique({ where: { id } });
    if (!proposal) throw new NotFoundError('Proposal not found');

    if (proposal.studentId !== studentId) {
      throw new ForbiddenError('Cannot cancel another student\'s proposal');
    }

    // Invariant (FR-047): student can cancel *only* while in Ready to Do
    if (proposal.status !== 'Ready to Do') {
      throw new BadRequestError(
        `Proposal cannot be canceled in status "${proposal.status}". Cancellation is only allowed in "Ready to Do" status.`
      );
    }

    return prisma.studentTaskProposal.update({
      where: { id },
      data: {
        status: 'Canceled',
        canceledAt: new Date()
      }
    });
  }

  static async completeProposal(id: string, adminId: string, correlationId: string) {
    return prisma.$transaction(async (tx) => {
      const proposal = await tx.studentTaskProposal.findUnique({
        where: { id },
        include: { student: true }
      });
      if (!proposal) throw new NotFoundError('Proposal not found');

      if (proposal.status !== 'Ready to Do') {
        throw new BadRequestError(`Cannot complete proposal in status "${proposal.status}". Must be in "Ready to Do".`);
      }

      const pointsToAward = proposal.assignedPointValue ?? 0;
      if (pointsToAward <= 0) {
        throw new BadRequestError('Proposal does not have a valid assigned point value');
      }

      const updatedProposal = await tx.studentTaskProposal.update({
        where: { id },
        data: {
          status: 'Completed',
          completedAt: new Date()
        }
      });

      // Award points to student
      const newCurrentPoints = proposal.student.currentPoints + pointsToAward;
      const newHighestBalance = Math.max(proposal.student.highestBalance, newCurrentPoints);

      await tx.student.update({
        where: { id: proposal.studentId },
        data: {
          currentPoints: newCurrentPoints,
          highestBalance: newHighestBalance
        }
      });

      await this.recalculateTier(tx, proposal.studentId, newCurrentPoints);

      // AuditRecord
      await tx.auditRecord.create({
        data: {
          correlationId,
          actionType: 'PROPOSAL_AWARD',
          actorRole: 'ADMIN',
          actorId: adminId,
          sourceType: 'SYSTEM_POOL',
          recipientType: 'STUDENT',
          recipientId: proposal.studentId,
          pointAmount: pointsToAward,
          relatedEntityType: 'PROPOSAL',
          relatedEntityId: id,
          resultingBalanceState: JSON.stringify({
            studentId: proposal.studentId,
            currentPoints: newCurrentPoints,
            highestBalance: newHighestBalance
          })
        }
      });

      return updatedProposal;
    });
  }

  static async declineProposal(id: string, adminId: string) {
    const proposal = await prisma.studentTaskProposal.findUnique({ where: { id } });
    if (!proposal) throw new NotFoundError('Proposal not found');

    if (proposal.status !== 'Pending to Approve') {
      throw new BadRequestError(`Cannot decline proposal in status "${proposal.status}"`);
    }

    return prisma.studentTaskProposal.update({
      where: { id },
      data: {
        status: 'Declined',
        reviewerId: adminId
      }
    });
  }

  static async postMessage(proposalId: string, role: string, senderId: string, input: PostProposalMessageInput) {
    if (role === 'TEACHER') {
      throw new ForbiddenError('Teachers cannot participate in proposal messaging');
    }

    const proposal = await prisma.studentTaskProposal.findUnique({ where: { id: proposalId } });
    if (!proposal) throw new NotFoundError('Proposal not found');

    if (role === 'STUDENT' && proposal.studentId !== senderId) {
      throw new ForbiddenError('You cannot message on another student\'s proposal');
    }

    return prisma.taskProposalMessage.create({
      data: {
        proposalId,
        senderRole: role as 'STUDENT' | 'ADMIN',
        senderId,
        messageBody: input.messageBody
      }
    });
  }

  static async getMessages(proposalId: string, role: string, userId: string) {
    if (role === 'TEACHER') {
      throw new ForbiddenError('Teachers cannot view proposal messages');
    }

    const proposal = await prisma.studentTaskProposal.findUnique({ where: { id: proposalId } });
    if (!proposal) throw new NotFoundError('Proposal not found');

    if (role === 'STUDENT' && proposal.studentId !== userId) {
      throw new ForbiddenError('You cannot view messages for another student\'s proposal');
    }

    return prisma.taskProposalMessage.findMany({
      where: { proposalId },
      orderBy: { createdAt: 'asc' }
    });
  }

  private static async recalculateTier(
    tx: Prisma.TransactionClient,
    studentId: string,
    currentPoints: number
  ) {
    const tiers = await tx.studentTier.findMany({
      where: { minPoints: { lte: currentPoints } },
      orderBy: { tierIndex: 'desc' }
    });
    const bestTier = tiers[0];
    if (bestTier) {
      await tx.student.update({
        where: { id: studentId },
        data: { currentTierId: bestTier.id }
      });
    }
  }
}
