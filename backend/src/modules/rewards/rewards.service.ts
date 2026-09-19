import { Prisma } from '@prisma/client';
import { prisma } from '../../core/prisma.js';
import {
  BadRequestError,
  NotFoundError
} from '../../core/errors.js';
import {
  CreateRewardInput,
  UpdateRewardInput,
  CreateRewardRequestInput
} from './rewards.schemas.js';

export class RewardsService {
  static async createReward(input: CreateRewardInput) {
    return prisma.reward.create({
      data: {
        name: input.name,
        description: input.description,
        imageRef: input.imageRef,
        pointPrice: input.pointPrice,
        requiresApproval: input.requiresApproval ?? false,
        inventory: input.requiresApproval ? null : (input.inventory ?? 0),
        status: 'Active'
      }
    });
  }

  static async getRewards() {
    return prisma.reward.findMany({
      where: { status: 'Active' },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async getRewardById(id: string) {
    const reward = await prisma.reward.findUnique({ where: { id } });
    if (!reward) throw new NotFoundError('Reward not found');
    return reward;
  }

  static async updateReward(id: string, input: UpdateRewardInput) {
    const reward = await prisma.reward.findUnique({ where: { id } });
    if (!reward) throw new NotFoundError('Reward not found');

    // Invariant (FR-025): pointPrice is strictly immutable
    if (input.pointPrice !== undefined && input.pointPrice !== reward.pointPrice) {
      throw new BadRequestError('Reward price is immutable and cannot be changed');
    }

    return prisma.reward.update({
      where: { id },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.description ? { description: input.description } : {}),
        ...(input.imageRef !== undefined ? { imageRef: input.imageRef } : {}),
        ...(input.inventory !== undefined ? { inventory: input.inventory } : {})
      }
    });
  }

  static async deleteReward(id: string, adminId: string, correlationId: string) {
    return prisma.$transaction(async (tx) => {
      const reward = await tx.reward.findUnique({ where: { id } });
      if (!reward) throw new NotFoundError('Reward not found');

      // Update reward to Removed
      await tx.reward.update({
        where: { id },
        data: { status: 'Removed' }
      });

      // Find active requests (Pending to Approve or Pending to Receive)
      const activeRequests = await tx.rewardRequest.findMany({
        where: {
          rewardId: id,
          status: { in: ['Pending to Approve', 'Pending to Receive'] }
        }
      });

      // Close requests and return reserved points (FR-026)
      for (const req of activeRequests) {
        await tx.rewardRequest.update({
          where: { id: req.id },
          data: { status: 'Declined' }
        });

        const student = await tx.student.findUnique({ where: { id: req.studentId } });
        if (student) {
          const newCurrentPoints = student.currentPoints + req.reservedPoints;
          const newReservedPoints = Math.max(0, student.reservedPoints - req.reservedPoints);

          await tx.student.update({
            where: { id: student.id },
            data: {
              currentPoints: newCurrentPoints,
              reservedPoints: newReservedPoints
            }
          });

          await this.recalculateTier(tx, student.id, newCurrentPoints);

          // Audit log for returned points due to reward removal
          await tx.auditRecord.create({
            data: {
              correlationId,
              actionType: 'REWARD_REMOVAL_RETURN',
              actorRole: 'ADMIN',
              actorId: adminId,
              sourceType: 'REWARD_RESERVED',
              recipientType: 'STUDENT',
              recipientId: student.id,
              pointAmount: req.reservedPoints,
              relatedEntityType: 'REWARD',
              relatedEntityId: id,
              resultingBalanceState: JSON.stringify({
                studentId: student.id,
                currentPoints: newCurrentPoints,
                reservedPoints: newReservedPoints
              })
            }
          });
        }
      }

      return { message: 'Reward removed from catalog and active requests refunded successfully' };
    });
  }

  static async createRequest(
    studentId: string,
    input: CreateRewardRequestInput,
    correlationId: string
  ) {
    return prisma.$transaction(async (tx) => {
      const student = await tx.student.findUnique({ where: { id: studentId } });
      if (!student) throw new NotFoundError('Student not found');
      if (student.accountState !== 'Active') {
        throw new BadRequestError('Cannot request rewards with non-active account');
      }

      const reward = await tx.reward.findUnique({ where: { id: input.rewardId } });
      if (!reward || reward.status !== 'Active') {
        throw new NotFoundError('Reward not found or no longer available');
      }

      if (student.currentPoints < reward.pointPrice) {
        throw new BadRequestError(
          `Insufficient point balance. Available: ${student.currentPoints}, Required: ${reward.pointPrice}`
        );
      }

      let initialStatus = 'Pending to Approve';

      if (!reward.requiresApproval) {
        if (reward.inventory === null || reward.inventory <= 0) {
          throw new BadRequestError('Reward is currently out of stock');
        }
        await tx.reward.update({
          where: { id: reward.id },
          data: { inventory: reward.inventory - 1 }
        });
        initialStatus = 'Pending to Receive';
      }

      // Atomically reserve points
      const newCurrentPoints = student.currentPoints - reward.pointPrice;
      const newReservedPoints = student.reservedPoints + reward.pointPrice;

      await tx.student.update({
        where: { id: studentId },
        data: {
          currentPoints: newCurrentPoints,
          reservedPoints: newReservedPoints
        }
      });

      await this.recalculateTier(tx, studentId, newCurrentPoints);

      const request = await tx.rewardRequest.create({
        data: {
          studentId,
          rewardId: reward.id,
          requiresApprovalSnapshot: reward.requiresApproval,
          pointPriceSnapshot: reward.pointPrice,
          reservedPoints: reward.pointPrice,
          status: initialStatus
        }
      });

      // AuditRecord for point reservation
      await tx.auditRecord.create({
        data: {
          correlationId,
          actionType: 'REWARD_RESERVATION',
          actorRole: 'STUDENT',
          actorId: studentId,
          sourceType: 'STUDENT',
          sourceId: studentId,
          recipientType: 'REWARD_RESERVED',
          pointAmount: reward.pointPrice,
          relatedEntityType: 'REWARD',
          relatedEntityId: reward.id,
          resultingBalanceState: JSON.stringify({
            studentId,
            currentPoints: newCurrentPoints,
            reservedPoints: newReservedPoints
          })
        }
      });

      return request;
    });
  }

  static async getRequests(role: string, userId: string, statusFilter?: string) {
    return prisma.rewardRequest.findMany({
      where: {
        ...(role === 'STUDENT' ? { studentId: userId } : {}),
        ...(statusFilter ? { status: statusFilter } : {})
      },
      include: {
        reward: true,
        student: { select: { id: true, firstName: true, lastName: true, username: true } },
        reviewer: { select: { id: true, firstName: true, lastName: true, username: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async approveRequest(requestId: string, adminId: string) {
    const request = await prisma.rewardRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundError('Reward request not found');

    if (request.status !== 'Pending to Approve') {
      throw new BadRequestError(`Cannot approve request in status "${request.status}"`);
    }

    return prisma.rewardRequest.update({
      where: { id: requestId },
      data: {
        status: 'Pending to Receive',
        reviewerId: adminId,
        reviewedAt: new Date()
      }
    });
  }

  static async declineRequest(requestId: string, adminId: string, correlationId: string) {
    return prisma.$transaction(async (tx) => {
      const request = await tx.rewardRequest.findUnique({
        where: { id: requestId },
        include: { reward: true }
      });
      if (!request) throw new NotFoundError('Reward request not found');

      if (!['Pending to Approve', 'Pending to Receive'].includes(request.status)) {
        throw new BadRequestError(`Cannot decline request in status "${request.status}"`);
      }

      // Update request to Declined
      const updated = await tx.rewardRequest.update({
        where: { id: requestId },
        data: {
          status: 'Declined',
          reviewerId: adminId,
          reviewedAt: new Date()
        }
      });

      // Return reserved points to student
      const student = await tx.student.findUnique({ where: { id: request.studentId } });
      if (student) {
        const newCurrentPoints = student.currentPoints + request.reservedPoints;
        const newReservedPoints = Math.max(0, student.reservedPoints - request.reservedPoints);

        await tx.student.update({
          where: { id: student.id },
          data: {
            currentPoints: newCurrentPoints,
            reservedPoints: newReservedPoints
          }
        });

        await this.recalculateTier(tx, student.id, newCurrentPoints);

        // If inventory-backed, restore inventory
        if (!request.requiresApprovalSnapshot && request.reward) {
          await tx.reward.update({
            where: { id: request.reward.id },
            data: { inventory: (request.reward.inventory ?? 0) + 1 }
          });
        }

        // AuditRecord
        await tx.auditRecord.create({
          data: {
            correlationId,
            actionType: 'REWARD_DECLINE_RETURN',
            actorRole: 'ADMIN',
            actorId: adminId,
            sourceType: 'REWARD_RESERVED',
            recipientType: 'STUDENT',
            recipientId: student.id,
            pointAmount: request.reservedPoints,
            relatedEntityType: 'REQUEST',
            relatedEntityId: requestId,
            resultingBalanceState: JSON.stringify({
              studentId: student.id,
              currentPoints: newCurrentPoints,
              reservedPoints: newReservedPoints
            })
          }
        });
      }

      return updated;
    });
  }

  static async receiveRequest(requestId: string, adminId: string, correlationId: string) {
    return prisma.$transaction(async (tx) => {
      const request = await tx.rewardRequest.findUnique({ where: { id: requestId } });
      if (!request) throw new NotFoundError('Reward request not found');

      if (request.status !== 'Pending to Receive') {
        throw new BadRequestError(`Cannot complete receive for request in status "${request.status}"`);
      }

      const updated = await tx.rewardRequest.update({
        where: { id: requestId },
        data: {
          status: 'Completed',
          receivedAt: new Date()
        }
      });

      // Finalize reserved points
      const student = await tx.student.findUnique({ where: { id: request.studentId } });
      if (student) {
        const newReservedPoints = Math.max(0, student.reservedPoints - request.reservedPoints);
        await tx.student.update({
          where: { id: student.id },
          data: { reservedPoints: newReservedPoints }
        });

        // AuditRecord
        await tx.auditRecord.create({
          data: {
            correlationId,
            actionType: 'REWARD_COMPLETED',
            actorRole: 'ADMIN',
            actorId: adminId,
            sourceType: 'REWARD_RESERVED',
            recipientType: 'STUDENT',
            recipientId: student.id,
            pointAmount: request.reservedPoints,
            relatedEntityType: 'REQUEST',
            relatedEntityId: requestId,
            resultingBalanceState: JSON.stringify({
              studentId: student.id,
              reservedPoints: newReservedPoints
            })
          }
        });
      }

      return updated;
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
