import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditLogService } from '../points/audit-log.service';
import {
  CreateRewardDto,
  UpdateRewardMetadataDto,
  CreateRewardRequestDto,
  DeclineRewardRequestDto,
} from './dto/rewards.dto';
import {
  Role,
  RewardStatus,
  RewardRequestStatus,
  ActorRole,
  SourceType,
  RecipientType,
  ActionType,
} from '@prisma/client';
import {
  RewardStatusChangedEvent,
  RewardRequiresApprovalEvent,
} from '../notifications/events/reward-events';

@Injectable()
export class RewardsService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
    private eventEmitter: EventEmitter2,
  ) {}

  // Catalog CRUD (FR-024, FR-085)
  async createReward(dto: CreateRewardDto) {
    if (
      !dto.requiresApproval &&
      (dto.inventoryQuantity === undefined || dto.inventoryQuantity === null)
    ) {
      throw new BadRequestException({
        statusCode: 400,
        errorCode: 'INVENTORY_REQUIRED_FOR_NON_APPROVAL',
        message: 'Non-approval rewards require an inventory quantity',
      });
    }

    return this.prisma.reward.create({
      data: {
        name: dto.name,
        description: dto.description,
        imageUrl: dto.imageUrl || null,
        pointPrice: dto.pointPrice,
        requiresApproval: dto.requiresApproval,
        inventoryQuantity: dto.requiresApproval ? null : dto.inventoryQuantity,
        status: RewardStatus.ACTIVE,
      },
    });
  }

  async findAllRewards(includeInactive = false) {
    const where = includeInactive ? {} : { status: RewardStatus.ACTIVE };
    return this.prisma.reward.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findRewardById(id: string) {
    const reward = await this.prisma.reward.findUnique({ where: { id } });
    if (!reward) {
      throw new NotFoundException({
        statusCode: 404,
        errorCode: 'REWARD_NOT_FOUND',
        message: `Reward with ID ${id} not found`,
      });
    }
    return reward;
  }

  // Price Immutability (FR-025)
  async updateRewardMetadata(id: string, dto: UpdateRewardMetadataDto) {
    await this.findRewardById(id);
    return this.prisma.reward.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        imageUrl: dto.imageUrl,
        inventoryQuantity: dto.inventoryQuantity,
      },
    });
  }

  // Reward Removal with Automatic Point Refunds (FR-034)
  async removeReward(id: string, adminId: string, correlationId: string) {
    const reward = await this.findRewardById(id);

    return this.prisma.$transaction(async (tx) => {
      // Mark reward as REMOVED
      const updatedReward = await tx.reward.update({
        where: { id },
        data: { status: RewardStatus.REMOVED },
      });

      // Find active requests
      const activeRequests = await tx.rewardRequest.findMany({
        where: {
          rewardId: id,
          status: {
            in: [RewardRequestStatus.PENDING_TO_APPROVE, RewardRequestStatus.PENDING_TO_RECEIVE],
          },
        },
        include: { student: { include: { studentProfile: true } } },
      });

      for (const req of activeRequests) {
        const reservedAmount = req.reservedAmount;

        // Refund points to student
        const studentProfile = await tx.studentProfile.findUnique({
          where: { id: req.studentId },
        });

        if (studentProfile && reservedAmount > 0) {
          const newCurrentBalance = studentProfile.currentBalance + reservedAmount;
          const newReservedBalance = Math.max(0, studentProfile.reservedBalance - reservedAmount);

          const matchingTier = await tx.tierConfiguration.findFirst({
            where: { minPointsThreshold: { lte: newCurrentBalance } },
            orderBy: { minPointsThreshold: 'desc' },
          });

          await tx.studentProfile.update({
            where: { id: req.studentId },
            data: {
              currentBalance: newCurrentBalance,
              reservedBalance: newReservedBalance,
              currentTierId: matchingTier?.id || studentProfile.currentTierId,
            },
          });

          await this.auditLogService.log(
            {
              correlationId,
              actorId: adminId,
              actorRole: ActorRole.ADMIN,
              sourceType: SourceType.STUDENT_RESERVED,
              sourceId: req.studentId,
              recipientType: RecipientType.STUDENT_CURRENT,
              recipientId: req.studentId,
              amount: reservedAmount,
              actionType: ActionType.REWARD_REMOVE_RETURN,
              taskOrReason: `Reward "${reward.name}" removed from catalog - refunded ${reservedAmount} points`,
              relatedEntityType: 'RewardRequest',
              relatedEntityId: req.id,
              resultingSourceBalance: newReservedBalance,
              resultingRecipientBalance: newCurrentBalance,
            },
            tx,
          );
        }

        // Close request
        await tx.rewardRequest.update({
          where: { id: req.id },
          data: {
            status: RewardRequestStatus.DECLINED,
            declineReason: 'Reward was removed from catalog',
            reservedAmount: 0,
          },
        });
      }

      return updatedReward;
    });
  }

  // Student Redemption Request (FR-026 - FR-031, FR-086)
  async createRewardRequest(dto: CreateRewardRequestDto, studentId: string, correlationId: string) {
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      include: { studentProfile: true },
    });

    if (!student || student.role !== Role.STUDENT || !student.studentProfile) {
      throw new ForbiddenException({
        statusCode: 403,
        errorCode: 'NOT_A_STUDENT',
        message: 'Only active students can request rewards',
      });
    }

    const reward = await this.prisma.reward.findUnique({
      where: { id: dto.rewardId },
    });

    if (!reward || reward.status !== RewardStatus.ACTIVE) {
      throw new BadRequestException({
        statusCode: 400,
        errorCode: 'REWARD_NOT_AVAILABLE',
        message: 'Reward is not available for redemption',
      });
    }

    // FR-096: Prevent duplicate pending requests for the same reward by the same student
    const existingPendingRequest = await this.prisma.rewardRequest.findFirst({
      where: {
        studentId,
        rewardId: dto.rewardId,
        status: {
          in: [
            RewardRequestStatus.PENDING_TO_APPROVE,
            RewardRequestStatus.PENDING_TO_RECEIVE,
          ],
        },
      },
    });

    if (existingPendingRequest) {
      throw new ConflictException({
        statusCode: 409,
        errorCode: 'DUPLICATE_PENDING_REQUEST',
        message:
          'You already have a pending request for this reward. Please wait until it is completed or declined before requesting again.',
      });
    }

    const createdRequest = await this.prisma.$transaction(async (tx) => {
      const profile = await tx.studentProfile.findUnique({
        where: { id: studentId },
      });

      if (!profile || profile.currentBalance < reward.pointPrice) {
        throw new BadRequestException({
          statusCode: 400,
          errorCode: 'INSUFFICIENT_BALANCE',
          message: `Insufficient points to redeem reward. Required: ${reward.pointPrice}, Available: ${profile?.currentBalance || 0}`,
        });
      }

      let initialStatus: RewardRequestStatus;

      if (!reward.requiresApproval) {
        if (reward.inventoryQuantity === null || reward.inventoryQuantity <= 0) {
          throw new BadRequestException({
            statusCode: 400,
            errorCode: 'INSUFFICIENT_INVENTORY',
            message: 'Reward is currently out of stock',
          });
        }

        // Decrement inventory atomically
        await tx.reward.update({
          where: { id: reward.id },
          data: { inventoryQuantity: { decrement: 1 } },
        });

        initialStatus = RewardRequestStatus.PENDING_TO_RECEIVE;
      } else {
        initialStatus = RewardRequestStatus.PENDING_TO_APPROVE;
      }

      // Reserve points
      const newCurrentBalance = profile.currentBalance - reward.pointPrice;
      const newReservedBalance = profile.reservedBalance + reward.pointPrice;

      const matchingTier = await tx.tierConfiguration.findFirst({
        where: { minPointsThreshold: { lte: newCurrentBalance } },
        orderBy: { minPointsThreshold: 'desc' },
      });

      await tx.studentProfile.update({
        where: { id: studentId },
        data: {
          currentBalance: newCurrentBalance,
          reservedBalance: newReservedBalance,
          currentTierId: matchingTier?.id || profile.currentTierId,
        },
      });

      const request = await tx.rewardRequest.create({
        data: {
          studentId,
          rewardId: reward.id,
          priceAtRequest: reward.pointPrice,
          requiresApproval: reward.requiresApproval,
          status: initialStatus,
          reservedAmount: reward.pointPrice,
        },
        include: { reward: true },
      });

      // Write audit log
      await this.auditLogService.log(
        {
          correlationId,
          actorId: studentId,
          actorRole: ActorRole.STUDENT,
          sourceType: SourceType.STUDENT_CURRENT,
          sourceId: studentId,
          recipientType: RecipientType.STUDENT_RESERVED,
          recipientId: studentId,
          amount: reward.pointPrice,
          actionType: ActionType.REWARD_RESERVE_POINTS,
          taskOrReason: `Point reservation for reward: ${reward.name}`,
          relatedEntityType: 'RewardRequest',
          relatedEntityId: request.id,
          resultingSourceBalance: newCurrentBalance,
          resultingRecipientBalance: newReservedBalance,
        },
        tx,
      );

      return request;
    });

    if (createdRequest.requiresApproval) {
      await this.eventEmitter.emitAsync(
        'reward.requires_approval',
        new RewardRequiresApprovalEvent(
          createdRequest.id,
          studentId,
          `${student.firstName} ${student.lastName}`,
          createdRequest.reward.name,
          createdRequest.priceAtRequest,
        ),
      );
    } else {
      await this.eventEmitter.emitAsync(
        'reward.status_changed',
        new RewardStatusChangedEvent(
          createdRequest.id,
          studentId,
          createdRequest.reward.name,
          RewardRequestStatus.PENDING_TO_RECEIVE,
          null,
        ),
      );
    }

    return createdRequest;
  }

  // Query Reward Requests
  async findAllRequests(filter: {
    studentId?: string;
    status?: RewardRequestStatus;
    currentUser: { id: string; role: Role };
  }) {
    const where: any = {};
    if (filter.currentUser.role === Role.STUDENT) {
      where.studentId = filter.currentUser.id;
    } else if (filter.studentId) {
      where.studentId = filter.studentId;
    }

    if (filter.status) {
      where.status = filter.status;
    }

    return this.prisma.rewardRequest.findMany({
      where,
      include: {
        reward: true,
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

  async findRequestById(id: string, currentUser: { id: string; role: Role }) {
    const req = await this.prisma.rewardRequest.findUnique({
      where: { id },
      include: {
        reward: true,
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

    if (!req) {
      throw new NotFoundException({
        statusCode: 404,
        errorCode: 'REQUEST_NOT_FOUND',
        message: 'Reward request not found',
      });
    }

    if (currentUser.role === Role.STUDENT && req.studentId !== currentUser.id) {
      throw new ForbiddenException({
        statusCode: 403,
        errorCode: 'FORBIDDEN',
        message: 'Cannot view requests of other students',
      });
    }

    return req;
  }

  // Admin Approval (FR-032)
  async approveRewardRequest(id: string, adminId: string) {
    const req = await this.prisma.rewardRequest.findUnique({
      where: { id },
      include: { reward: true },
    });

    if (!req) {
      throw new NotFoundException({
        statusCode: 404,
        errorCode: 'REQUEST_NOT_FOUND',
        message: 'Reward request not found',
      });
    }

    if (req.status !== RewardRequestStatus.PENDING_TO_APPROVE) {
      throw new BadRequestException({
        statusCode: 400,
        errorCode: 'INVALID_REQUEST_STATE',
        message: `Cannot approve request in status ${req.status}`,
      });
    }

    const updated = await this.prisma.rewardRequest.update({
      where: { id },
      data: {
        status: RewardRequestStatus.PENDING_TO_RECEIVE,
        reviewedByAdminId: adminId,
        reviewedAt: new Date(),
      },
      include: { reward: true },
    });

    await this.eventEmitter.emitAsync(
      'reward.status_changed',
      new RewardStatusChangedEvent(
        updated.id,
        updated.studentId,
        updated.reward.name,
        RewardRequestStatus.PENDING_TO_RECEIVE,
        null,
      ),
    );

    return updated;
  }

  // Admin Decline with Point Refund (FR-032)
  async declineRewardRequest(
    id: string,
    dto: DeclineRewardRequestDto,
    adminId: string,
    correlationId: string,
  ) {
    const req = await this.prisma.rewardRequest.findUnique({
      where: { id },
      include: { reward: true },
    });

    if (!req) {
      throw new NotFoundException({
        statusCode: 404,
        errorCode: 'REQUEST_NOT_FOUND',
        message: 'Reward request not found',
      });
    }

    if (
      req.status !== RewardRequestStatus.PENDING_TO_APPROVE &&
      req.status !== RewardRequestStatus.PENDING_TO_RECEIVE
    ) {
      throw new BadRequestException({
        statusCode: 400,
        errorCode: 'INVALID_REQUEST_STATE',
        message: `Cannot decline request in status ${req.status}`,
      });
    }

    const updatedRequest = await this.prisma.$transaction(async (tx) => {
      // If non-approval, return inventory
      if (!req.requiresApproval && req.reward.inventoryQuantity !== null) {
        await tx.reward.update({
          where: { id: req.rewardId },
          data: { inventoryQuantity: { increment: 1 } },
        });
      }

      // Refund reserved points back to student
      const studentProfile = await tx.studentProfile.findUnique({
        where: { id: req.studentId },
      });

      const reservedAmount = req.reservedAmount;
      const newCurrentBalance = (studentProfile?.currentBalance || 0) + reservedAmount;
      const newReservedBalance = Math.max(
        0,
        (studentProfile?.reservedBalance || 0) - reservedAmount,
      );

      const matchingTier = await tx.tierConfiguration.findFirst({
        where: { minPointsThreshold: { lte: newCurrentBalance } },
        orderBy: { minPointsThreshold: 'desc' },
      });

      await tx.studentProfile.update({
        where: { id: req.studentId },
        data: {
          currentBalance: newCurrentBalance,
          reservedBalance: newReservedBalance,
          currentTierId: matchingTier?.id || studentProfile?.currentTierId,
        },
      });

      const updated = await tx.rewardRequest.update({
        where: { id },
        data: {
          status: RewardRequestStatus.DECLINED,
          declineReason: dto.declineReason || 'Declined by administrator',
          reservedAmount: 0,
          reviewedByAdminId: adminId,
          reviewedAt: new Date(),
        },
        include: { reward: true },
      });

      // Audit log
      await this.auditLogService.log(
        {
          correlationId,
          actorId: adminId,
          actorRole: ActorRole.ADMIN,
          sourceType: SourceType.STUDENT_RESERVED,
          sourceId: req.studentId,
          recipientType: RecipientType.STUDENT_CURRENT,
          recipientId: req.studentId,
          amount: reservedAmount,
          actionType: ActionType.REWARD_DECLINE_RETURN,
          taskOrReason: `Reward request declined: ${dto.declineReason || 'Declined by admin'}`,
          relatedEntityType: 'RewardRequest',
          relatedEntityId: req.id,
          resultingSourceBalance: newReservedBalance,
          resultingRecipientBalance: newCurrentBalance,
        },
        tx,
      );

      return updated;
    });

    await this.eventEmitter.emitAsync(
      'reward.status_changed',
      new RewardStatusChangedEvent(
        updatedRequest.id,
        updatedRequest.studentId,
        updatedRequest.reward.name,
        RewardRequestStatus.DECLINED,
        dto.declineReason || 'Declined by administrator',
      ),
    );

    return updatedRequest;
  }

  // Physical Handover Completed (FR-033)
  async receiveRewardRequest(id: string, adminId: string, correlationId: string) {
    const req = await this.prisma.rewardRequest.findUnique({
      where: { id },
      include: { reward: true },
    });

    if (!req) {
      throw new NotFoundException({
        statusCode: 404,
        errorCode: 'REQUEST_NOT_FOUND',
        message: 'Reward request not found',
      });
    }

    if (req.status !== RewardRequestStatus.PENDING_TO_RECEIVE) {
      throw new BadRequestException({
        statusCode: 400,
        errorCode: 'INVALID_REQUEST_STATE',
        message: `Cannot confirm receive for request in status ${req.status}. Must be PENDING_TO_RECEIVE`,
      });
    }

    const updatedRequest = await this.prisma.$transaction(async (tx) => {
      // Clear reserved balance from student
      const studentProfile = await tx.studentProfile.findUnique({
        where: { id: req.studentId },
      });

      const reservedAmount = req.reservedAmount;
      const newReservedBalance = Math.max(
        0,
        (studentProfile?.reservedBalance || 0) - reservedAmount,
      );

      await tx.studentProfile.update({
        where: { id: req.studentId },
        data: {
          reservedBalance: newReservedBalance,
        },
      });

      const updated = await tx.rewardRequest.update({
        where: { id },
        data: {
          status: RewardRequestStatus.COMPLETED,
          completedAt: new Date(),
          reservedAmount: 0,
        },
        include: { reward: true },
      });

      // Audit log
      await this.auditLogService.log(
        {
          correlationId,
          actorId: adminId,
          actorRole: ActorRole.ADMIN,
          sourceType: SourceType.STUDENT_RESERVED,
          sourceId: req.studentId,
          recipientType: RecipientType.NONE,
          amount: reservedAmount,
          actionType: ActionType.REWARD_RECEIVE_COMPLETE,
          taskOrReason: `Physical handover completed for reward: ${req.reward.name}`,
          relatedEntityType: 'RewardRequest',
          relatedEntityId: req.id,
          resultingSourceBalance: newReservedBalance,
        },
        tx,
      );

      return updated;
    });

    await this.eventEmitter.emitAsync(
      'reward.status_changed',
      new RewardStatusChangedEvent(
        updatedRequest.id,
        updatedRequest.studentId,
        updatedRequest.reward.name,
        RewardRequestStatus.COMPLETED,
        null,
      ),
    );

    return updatedRequest;
  }
}
