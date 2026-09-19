import { Prisma } from '@prisma/client';
import { prisma } from '../../core/prisma.js';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError
} from '../../core/errors.js';
import {
  CreateActivityInput,
  UpdateActivityInput,
  ReviewVerificationInput
} from './activities.schemas.js';

export class ActivitiesService {
  static async createActivity(input: CreateActivityInput) {
    return prisma.challengeMission.create({
      data: {
        type: input.type,
        name: input.name,
        description: input.description,
        pointValue: input.pointValue,
        completionLimit: input.completionLimit ?? 1,
        status: 'Active'
      }
    });
  }

  static async getActivities(filter?: { type?: string; status?: string }) {
    return prisma.challengeMission.findMany({
      where: {
        ...(filter?.type ? { type: filter.type } : {}),
        status: filter?.status ?? 'Active'
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async getActivityById(id: string) {
    const activity = await prisma.challengeMission.findUnique({ where: { id } });
    if (!activity) throw new NotFoundError('Activity not found');
    return activity;
  }

  static async updateActivity(id: string, input: UpdateActivityInput) {
    const activity = await prisma.challengeMission.findUnique({ where: { id } });
    if (!activity) throw new NotFoundError('Activity not found');

    // Invariant (FR-036): pointValue is strictly immutable
    if (input.pointValue !== undefined && input.pointValue !== activity.pointValue) {
      throw new BadRequestError('Challenge/Mission point value is immutable and cannot be modified');
    }

    return prisma.challengeMission.update({
      where: { id },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.description ? { description: input.description } : {}),
        ...(input.completionLimit !== undefined ? { completionLimit: input.completionLimit } : {}),
        ...(input.status ? { status: input.status } : {})
      }
    });
  }

  static async submitVerification(
    studentId: string,
    activityId: string,
    evidenceDescription: string,
    attachments?: Array<{ originalFilename: string; storedPath: string; mimeType: string; sizeBytes: number }>
  ) {
    return prisma.$transaction(async (tx) => {
      const student = await tx.student.findUnique({ where: { id: studentId } });
      if (!student) throw new NotFoundError('Student not found');
      if (student.accountState !== 'Active') {
        throw new BadRequestError('Cannot submit verification with non-active account');
      }

      const activity = await tx.challengeMission.findUnique({ where: { id: activityId } });
      if (!activity || activity.status !== 'Active') {
        throw new NotFoundError('Activity not found or inactive');
      }

      // Check active ban
      const now = new Date();
      const activeBan = await tx.studentActivityBan.findFirst({
        where: {
          studentId,
          activityId,
          unbannedAt: null,
          bannedUntil: { gt: now }
        }
      });
      if (activeBan) {
        throw new ForbiddenError(
          `You are currently banned from submitting verification for this activity until ${activeBan.bannedUntil.toISOString()} due to 3 accumulated rejections.`
        );
      }

      // Check completion limit
      const acceptedCount = await tx.activityVerificationRequest.count({
        where: {
          studentId,
          activityId,
          status: 'Accepted'
        }
      });
      if (acceptedCount >= activity.completionLimit) {
        throw new BadRequestError('Activity completion limit reached for this student');
      }

      const verification = await tx.activityVerificationRequest.create({
        data: {
          studentId,
          activityId,
          evidenceDescription,
          status: 'Pending',
          attachments: attachments && attachments.length > 0 ? {
            create: attachments
          } : undefined
        },
        include: { attachments: true }
      });

      return verification;
    });
  }

  static async reviewVerification(
    verificationId: string,
    adminId: string,
    input: ReviewVerificationInput,
    correlationId: string
  ) {
    return prisma.$transaction(async (tx) => {
      const verification = await tx.activityVerificationRequest.findUnique({
        where: { id: verificationId },
        include: { activity: true, student: true }
      });
      if (!verification) throw new NotFoundError('Verification request not found');

      if (verification.status !== 'Pending') {
        throw new BadRequestError(`Cannot review verification in status "${verification.status}"`);
      }

      const outcome = input.decision || input.action;
      if (!outcome) {
        throw new BadRequestError('Review decision or action is required');
      }

      if (outcome === 'Accepted') {
        const updated = await tx.activityVerificationRequest.update({
          where: { id: verificationId },
          data: {
            status: 'Accepted',
            reviewerId: adminId,
            reviewNotes: input.reviewNotes,
            reviewedAt: new Date()
          }
        });

        // Award points to student
        const newCurrentPoints = verification.student.currentPoints + verification.activity.pointValue;
        const newHighestBalance = Math.max(verification.student.highestBalance, newCurrentPoints);

        await tx.student.update({
          where: { id: verification.studentId },
          data: {
            currentPoints: newCurrentPoints,
            highestBalance: newHighestBalance
          }
        });

        await this.recalculateTier(tx, verification.studentId, newCurrentPoints);

        // AuditRecord
        await tx.auditRecord.create({
          data: {
            correlationId,
            actionType: 'CHALLENGE_AWARD',
            actorRole: 'ADMIN',
            actorId: adminId,
            sourceType: 'SYSTEM_POOL',
            recipientType: 'STUDENT',
            recipientId: verification.studentId,
            pointAmount: verification.activity.pointValue,
            relatedEntityType: 'CHALLENGE',
            relatedEntityId: verification.activityId,
            resultingBalanceState: JSON.stringify({
              studentId: verification.studentId,
              currentPoints: newCurrentPoints,
              highestBalance: newHighestBalance
            })
          }
        });

        return updated;
      }

      // Decision is Rejected
      const updated = await tx.activityVerificationRequest.update({
        where: { id: verificationId },
        data: {
          status: 'Rejected',
          reviewerId: adminId,
          reviewNotes: input.reviewNotes,
          reviewedAt: new Date()
        }
      });

      // Count rejections for this student & activity
      const rejectionCount = await tx.activityVerificationRequest.count({
        where: {
          studentId: verification.studentId,
          activityId: verification.activityId,
          status: 'Rejected'
        }
      });

      // Automatically trigger 30-day ban on 3rd rejection (FR-041)
      if (rejectionCount >= 3) {
        const now = new Date();
        const bannedUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        await tx.studentActivityBan.create({
          data: {
            studentId: verification.studentId,
            activityId: verification.activityId,
            bannedAt: now,
            bannedUntil,
            reason: 'Automated 3-rejection abuse ban'
          }
        });
      }

      return updated;
    });
  }

  static async unbanStudent(studentId: string, activityId: string, adminId: string) {
    const ban = await prisma.studentActivityBan.findFirst({
      where: {
        studentId,
        activityId,
        unbannedAt: null
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!ban) {
      throw new NotFoundError('No active ban found for this student and activity');
    }

    await prisma.studentActivityBan.update({
      where: { id: ban.id },
      data: {
        unbannedAt: new Date(),
        unbannedById: adminId
      }
    });

    return { message: 'Student successfully unbanned for this activity' };
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
