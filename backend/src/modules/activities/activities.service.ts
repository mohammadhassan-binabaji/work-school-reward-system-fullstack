import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditLogService } from '../points/audit-log.service';
import {
  CreateActivityDto,
  UpdateActivityMetadataDto,
  SubmitVerificationDto,
  RejectVerificationDto,
  UnbanStudentDto,
} from './dto/activities.dto';
import {
  Role,
  ActivityStatus,
  VerificationStatus,
  ActorRole,
  SourceType,
  RecipientType,
  ActionType,
} from '@prisma/client';
import {
  VerificationReviewedEvent,
  VerificationSubmittedEvent,
  ActivityBanEvent,
  ActivityUnblockEvent,
} from '../notifications/events/activity-events';

@Injectable()
export class ActivitiesService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {}

  // Activity CRUD (FR-035, FR-036, FR-087)
  async createActivity(dto: CreateActivityDto) {
    return this.prisma.activity.create({
      data: {
        type: dto.type,
        title: dto.title,
        description: dto.description,
        pointValue: dto.pointValue,
        completionLimit: dto.completionLimit,
        status: dto.status || ActivityStatus.ACTIVE,
      },
    });
  }

  async findAllActivities(currentUser?: { id: string; role: Role } | Role) {
    const role = typeof currentUser === 'string' ? currentUser : currentUser?.role;
    const studentId = typeof currentUser === 'object' && currentUser ? currentUser.id : undefined;

    if (role === Role.STUDENT && studentId) {
      const activities = await this.prisma.activity.findMany({
        where: { status: ActivityStatus.ACTIVE },
        orderBy: { createdAt: 'desc' },
      });

      if (activities.length === 0) {
        return [];
      }

      const activityIds = activities.map((a) => a.id);

      const [progressList, verifications] = await Promise.all([
        this.prisma.studentActivityProgress.findMany({
          where: {
            studentId,
            activityId: { in: activityIds },
          },
        }),
        this.prisma.verificationRequest.findMany({
          where: {
            studentId,
            activityId: { in: activityIds },
          },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      const progressMap = new Map(progressList.map((p) => [p.activityId, p]));
      const latestVerificationMap = new Map<string, VerificationStatus>();
      for (const v of verifications) {
        if (!latestVerificationMap.has(v.activityId)) {
          latestVerificationMap.set(v.activityId, v.status);
        }
      }

      const now = new Date();
      return activities.map((activity) => {
        const progress = progressMap.get(activity.id);
        const completionCount = progress?.completionCount ?? 0;
        const isBanned = Boolean(progress?.bannedUntil && progress.bannedUntil > now);
        const isDone = completionCount >= activity.completionLimit;
        const verificationStatus = latestVerificationMap.get(activity.id) ?? null;

        return {
          ...activity,
          completionCount,
          isBanned,
          isDone,
          verificationStatus,
        };
      });
    }

    const where = role === Role.STUDENT ? { status: ActivityStatus.ACTIVE } : {};
    return this.prisma.activity.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findActivityById(id: string, currentUser?: { id: string; role: Role } | Role) {
    const activity = await this.prisma.activity.findUnique({ where: { id } });
    if (!activity) {
      throw new NotFoundException({
        statusCode: 404,
        errorCode: 'ACTIVITY_NOT_FOUND',
        message: `Activity with ID ${id} not found`,
      });
    }

    const role = typeof currentUser === 'string' ? currentUser : currentUser?.role;
    const studentId = typeof currentUser === 'object' && currentUser ? currentUser.id : undefined;

    if (role === Role.STUDENT && studentId) {
      const [progress, latestVerification] = await Promise.all([
        this.prisma.studentActivityProgress.findUnique({
          where: {
            studentId_activityId: {
              studentId,
              activityId: id,
            },
          },
        }),
        this.prisma.verificationRequest.findFirst({
          where: {
            studentId,
            activityId: id,
          },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      const now = new Date();
      const completionCount = progress?.completionCount ?? 0;
      const isBanned = Boolean(progress?.bannedUntil && progress.bannedUntil > now);
      const isDone = completionCount >= activity.completionLimit;
      const verificationStatus = latestVerification?.status ?? null;

      return {
        ...activity,
        completionCount,
        isBanned,
        isDone,
        verificationStatus,
      };
    }

    return activity;
  }

  async updateActivityMetadata(id: string, dto: UpdateActivityMetadataDto) {
    await this.findActivityById(id);
    return this.prisma.activity.update({
      where: { id },
      data: dto,
    });
  }

  async deleteActivity(id: string) {
    await this.findActivityById(id);
    return this.prisma.activity.update({
      where: { id },
      data: { status: ActivityStatus.REMOVED },
    });
  }

  // Student Submissions & Verifications (FR-037, FR-088, FR-040)
  async submitVerification(activityId: string, dto: SubmitVerificationDto, studentId: string) {
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
    });

    if (!activity || activity.status !== ActivityStatus.ACTIVE) {
      throw new BadRequestException({
        statusCode: 400,
        errorCode: 'ACTIVITY_NOT_ACTIVE',
        message: 'Activity is not active or available for submission',
      });
    }

    // Check student progress for ban and completion limit
    const progress = await this.prisma.studentActivityProgress.findUnique({
      where: {
        studentId_activityId: {
          studentId,
          activityId,
        },
      },
    });

    if (progress) {
      if (progress.bannedUntil && progress.bannedUntil > new Date()) {
        throw new ForbiddenException({
          statusCode: 403,
          errorCode: 'STUDENT_ACTIVITY_BANNED',
          message: `You are temporarily banned from submitting to this activity until ${progress.bannedUntil.toISOString()}`,
        });
      } else if (progress.bannedUntil && progress.bannedUntil <= new Date()) {
        // Ban expired, reset counter
        await this.prisma.studentActivityProgress.update({
          where: { id: progress.id },
          data: { bannedUntil: null, rejectionCount: 0 },
        });
      }

      if (progress.completionCount >= activity.completionLimit) {
        throw new BadRequestException({
          statusCode: 400,
          errorCode: 'COMPLETION_LIMIT_REACHED',
          message: `You have reached the maximum completion limit (${activity.completionLimit}) for this activity`,
        });
      }
    }

    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
    });
    const studentName = student ? `${student.firstName} ${student.lastName}` : 'Student';

    const verification = await this.prisma.verificationRequest.create({
      data: {
        studentId,
        activityId,
        textDescription: dto.textDescription,
        fileAttachmentUrl: dto.fileAttachmentUrl || null,
        status: VerificationStatus.PENDING,
      },
      include: {
        activity: true,
      },
    });

    await this.eventEmitter.emitAsync(
      'verification.submitted',
      new VerificationSubmittedEvent(
        verification.id,
        studentId,
        studentName,
        activity.type,
        activity.title,
      ),
    );

    return verification;
  }

  async findAllVerifications(filter: {
    activityId?: string;
    studentId?: string;
    status?: VerificationStatus;
    currentUser: { id: string; role: Role };
  }) {
    const where: any = {};
    if (filter.currentUser.role === Role.STUDENT) {
      where.studentId = filter.currentUser.id;
    } else if (filter.studentId) {
      where.studentId = filter.studentId;
    }

    if (filter.activityId) where.activityId = filter.activityId;
    if (filter.status) where.status = filter.status;

    return this.prisma.verificationRequest.findMany({
      where,
      include: {
        activity: true,
        student: {
          select: {
            id: true,
            nationalId: true,
            firstName: true,
            lastName: true,
            username: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findVerificationById(id: string, currentUser: { id: string; role: Role }) {
    const verification = await this.prisma.verificationRequest.findUnique({
      where: { id },
      include: {
        activity: true,
        student: {
          select: {
            id: true,
            nationalId: true,
            firstName: true,
            lastName: true,
            username: true,
          },
        },
      },
    });

    if (!verification) {
      throw new NotFoundException({
        statusCode: 404,
        errorCode: 'VERIFICATION_NOT_FOUND',
        message: 'Verification request not found',
      });
    }

    if (currentUser.role === Role.STUDENT && verification.studentId !== currentUser.id) {
      throw new ForbiddenException({
        statusCode: 403,
        errorCode: 'FORBIDDEN',
        message: 'Cannot view verifications of other students',
      });
    }

    return verification;
  }

  // Admin Acceptance (FR-038, FR-039)
  async acceptVerification(id: string, adminId: string, correlationId: string) {
    const verification = await this.prisma.verificationRequest.findUnique({
      where: { id },
      include: { activity: true },
    });

    if (!verification) {
      throw new NotFoundException({
        statusCode: 404,
        errorCode: 'VERIFICATION_NOT_FOUND',
        message: 'Verification request not found',
      });
    }

    if (verification.status !== VerificationStatus.PENDING) {
      throw new BadRequestException({
        statusCode: 400,
        errorCode: 'INVALID_VERIFICATION_STATE',
        message: `Cannot accept verification in status ${verification.status}`,
      });
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Update verification
      const updatedVerification = await tx.verificationRequest.update({
        where: { id },
        data: {
          status: VerificationStatus.ACCEPTED,
          reviewedByAdminId: adminId,
          reviewedAt: new Date(),
        },
        include: { activity: true },
      });

      // Update progress
      await tx.studentActivityProgress.upsert({
        where: {
          studentId_activityId: {
            studentId: verification.studentId,
            activityId: verification.activityId,
          },
        },
        create: {
          studentId: verification.studentId,
          activityId: verification.activityId,
          completionCount: 1,
          rejectionCount: 0,
        },
        update: {
          completionCount: { increment: 1 },
        },
      });

      // Credit student points
      const studentProfile = await tx.studentProfile.findUnique({
        where: { id: verification.studentId },
      });

      const awardPoints = verification.activity.pointValue;
      const newCurrentBalance = (studentProfile?.currentBalance || 0) + awardPoints;
      const newHighestBalance = Math.max(studentProfile?.highestBalance || 0, newCurrentBalance);

      const matchingTier = await tx.tierConfiguration.findFirst({
        where: { minPointsThreshold: { lte: newCurrentBalance } },
        orderBy: { minPointsThreshold: 'desc' },
      });

      await tx.studentProfile.update({
        where: { id: verification.studentId },
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
          recipientId: verification.studentId,
          amount: awardPoints,
          actionType: ActionType.CHALLENGE_AWARD_STUDENT,
          taskOrReason: `Challenge/Mission verified: ${verification.activity.title}`,
          relatedEntityType: 'VerificationRequest',
          relatedEntityId: verification.id,
          resultingRecipientBalance: newCurrentBalance,
        },
        tx,
      );

      return updatedVerification;
    });

    await this.eventEmitter.emitAsync(
      'verification.reviewed',
      new VerificationReviewedEvent(
        result.id,
        result.studentId,
        result.activity.type,
        result.activity.title,
        VerificationStatus.ACCEPTED,
        result.activity.pointValue,
        null,
      ),
    );

    return result;
  }

  // Admin Rejection & Dynamic 3-Strike Ban (FR-041, FR-042)
  async rejectVerification(id: string, dto: RejectVerificationDto, adminId: string) {
    const verification = await this.prisma.verificationRequest.findUnique({
      where: { id },
      include: { activity: true },
    });

    if (!verification) {
      throw new NotFoundException({
        statusCode: 404,
        errorCode: 'VERIFICATION_NOT_FOUND',
        message: 'Verification request not found',
      });
    }

    if (verification.status !== VerificationStatus.PENDING) {
      throw new BadRequestException({
        statusCode: 400,
        errorCode: 'INVALID_VERIFICATION_STATE',
        message: `Cannot reject verification in status ${verification.status}`,
      });
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedVerification = await tx.verificationRequest.update({
        where: { id },
        data: {
          status: VerificationStatus.REJECTED,
          rejectionReason: dto.rejectionReason || 'Submission rejected by administrator',
          reviewedByAdminId: adminId,
          reviewedAt: new Date(),
        },
        include: { activity: true },
      });

      // Update progress rejection counter
      const currentProgress = await tx.studentActivityProgress.findUnique({
        where: {
          studentId_activityId: {
            studentId: verification.studentId,
            activityId: verification.activityId,
          },
        },
      });

      const newRejectionCount = (currentProgress?.rejectionCount || 0) + 1;
      let bannedUntil: Date | null = currentProgress?.bannedUntil || null;

      if (newRejectionCount >= 3) {
        const banDays = this.configService.get<number>('app.activityBanDurationDays') || 30;
        bannedUntil = new Date(Date.now() + banDays * 24 * 60 * 60 * 1000);
      }

      await tx.studentActivityProgress.upsert({
        where: {
          studentId_activityId: {
            studentId: verification.studentId,
            activityId: verification.activityId,
          },
        },
        create: {
          studentId: verification.studentId,
          activityId: verification.activityId,
          completionCount: 0,
          rejectionCount: 1,
          bannedUntil,
        },
        update: {
          rejectionCount: newRejectionCount,
          bannedUntil,
        },
      });

      return {
        ...updatedVerification,
        studentRejectionCount: newRejectionCount,
        studentBannedUntil: bannedUntil,
      };
    });

    await this.eventEmitter.emitAsync(
      'verification.reviewed',
      new VerificationReviewedEvent(
        result.id,
        result.studentId,
        result.activity.type,
        result.activity.title,
        VerificationStatus.REJECTED,
        undefined,
        dto.rejectionReason || 'Submission rejected by administrator',
      ),
    );

    if (result.studentBannedUntil) {
      await this.eventEmitter.emitAsync(
        'activity.ban',
        new ActivityBanEvent(
          result.activityId,
          result.studentId,
          result.activity.title,
          result.studentBannedUntil,
        ),
      );
    }

    return result;
  }

  // Admin Manual Unban (FR-043)
  async unbanStudent(studentId: string, dto: UnbanStudentDto) {
    const progress = await this.prisma.studentActivityProgress.findUnique({
      where: {
        studentId_activityId: {
          studentId,
          activityId: dto.activityId,
        },
      },
      include: {
        activity: true,
      },
    });

    if (!progress) {
      throw new NotFoundException({
        statusCode: 404,
        errorCode: 'PROGRESS_NOT_FOUND',
        message: 'No progress or ban found for this student and activity',
      });
    }

    const updated = await this.prisma.studentActivityProgress.update({
      where: {
        studentId_activityId: {
          studentId,
          activityId: dto.activityId,
        },
      },
      data: {
        bannedUntil: null,
        rejectionCount: 0,
      },
    });

    await this.eventEmitter.emitAsync(
      'activity.unblock',
      new ActivityUnblockEvent(
        dto.activityId,
        studentId,
        progress.activity?.title || 'Activity',
      ),
    );

    return updated;
  }
}
