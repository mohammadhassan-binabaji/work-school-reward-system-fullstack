import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  AccountState,
  OriginatingEntityType,
  RewardRequestStatus,
  ProposalStatus,
  Role,
  VerificationStatus,
} from '@prisma/client';
import {
  RewardStatusChangedEvent,
  RewardRequiresApprovalEvent,
} from './events/reward-events';
import {
  ProposalStatusChangedEvent,
  ProposalSubmittedEvent,
  ProposalMessageEvent,
} from './events/proposal-events';
import {
  PointAwardedEvent,
  PointAdjustedEvent,
  PointAllocatedEvent,
} from './events/point-events';
import {
  VerificationReviewedEvent,
  VerificationSubmittedEvent,
  ActivityBanEvent,
  ActivityUnblockEvent,
} from './events/activity-events';
import { NotificationFormatter } from './utils/notification-formatter';

@Injectable()
export class NotificationsListener {
  private readonly logger = new Logger(NotificationsListener.name);

  constructor(private readonly prisma: PrismaService) {}

  private async isRecipientActive(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { accountState: true },
    });
    return user?.accountState === AccountState.ACTIVE;
  }

  private async getActiveAdminIds(): Promise<string[]> {
    const admins = await this.prisma.user.findMany({
      where: {
        role: Role.ADMIN,
        accountState: AccountState.ACTIVE,
      },
      select: { id: true },
    });
    return admins.map((a) => a.id);
  }

  @OnEvent('reward.status_changed')
  async handleRewardStatusChanged(event: RewardStatusChangedEvent) {
    if (!(await this.isRecipientActive(event.studentId))) return;

    let formatted = { subject: '', body: '' };
    if (event.newStatus === RewardRequestStatus.PENDING_TO_RECEIVE) {
      formatted = NotificationFormatter.formatRewardReadyForPickup(event.rewardName);
    } else if (event.newStatus === RewardRequestStatus.COMPLETED) {
      formatted = NotificationFormatter.formatRewardCompleted(event.rewardName);
    } else if (event.newStatus === RewardRequestStatus.DECLINED) {
      formatted = NotificationFormatter.formatRewardDeclined(
        event.rewardName,
        event.declineReason || 'Declined by administrator',
      );
    } else {
      return;
    }

    this.logger.log(`Creating reward status notification for student ${event.studentId}: ${formatted.subject}`);
    await this.prisma.notification.create({
      data: {
        recipientId: event.studentId,
        subject: formatted.subject,
        body: formatted.body,
        originatingEntityType: OriginatingEntityType.REWARD_REQUEST,
        originatingEntityId: event.requestId,
      },
    });
  }

  @OnEvent('reward.requires_approval')
  async handleRewardRequiresApproval(event: RewardRequiresApprovalEvent) {
    const adminIds = await this.getActiveAdminIds();
    if (adminIds.length === 0) return;

    const formatted = NotificationFormatter.formatRewardRequiresApproval(
      event.studentName,
      event.rewardName,
      event.priceAtRequest,
    );

    this.logger.log(`Broadcasting reward approval review alert to ${adminIds.length} administrators for request ${event.requestId}`);
    await this.prisma.notification.createMany({
      data: adminIds.map((adminId) => ({
        recipientId: adminId,
        subject: formatted.subject,
        body: formatted.body,
        originatingEntityType: OriginatingEntityType.REWARD_REQUEST,
        originatingEntityId: event.requestId,
      })),
    });
  }

  @OnEvent('proposal.status_changed')
  async handleProposalStatusChanged(event: ProposalStatusChangedEvent) {
    if (!(await this.isRecipientActive(event.studentId))) return;

    let formatted = { subject: '', body: '' };
    if (event.newStatus === ProposalStatus.READY_TO_DO) {
      formatted = NotificationFormatter.formatProposalApproved(
        event.assignedPointValue ?? 0,
      );
    } else if (event.newStatus === ProposalStatus.DECLINED) {
      formatted = NotificationFormatter.formatProposalDeclined(
        event.declineReason || 'Declined by administrator',
      );
    } else if (event.newStatus === ProposalStatus.COMPLETED) {
      formatted = NotificationFormatter.formatProposalCompleted(
        event.assignedPointValue ?? 0,
      );
    } else {
      return;
    }

    await this.prisma.notification.create({
      data: {
        recipientId: event.studentId,
        subject: formatted.subject,
        body: formatted.body,
        originatingEntityType: OriginatingEntityType.TASK_PROPOSAL,
        originatingEntityId: event.proposalId,
      },
    });
  }

  @OnEvent('proposal.submitted')
  async handleProposalSubmitted(event: ProposalSubmittedEvent) {
    const adminIds = await this.getActiveAdminIds();
    if (adminIds.length === 0) return;

    const formatted = NotificationFormatter.formatProposalSubmitted(
      event.studentName,
      event.proposalDescriptionSummary,
    );

    await this.prisma.notification.createMany({
      data: adminIds.map((adminId) => ({
        recipientId: adminId,
        subject: formatted.subject,
        body: formatted.body,
        originatingEntityType: OriginatingEntityType.TASK_PROPOSAL,
        originatingEntityId: event.proposalId,
      })),
    });
  }

  @OnEvent('proposal.message')
  async handleProposalMessage(event: ProposalMessageEvent) {
    if (event.senderRole === Role.ADMIN) {
      if (!(await this.isRecipientActive(event.studentId))) return;

      const formatted = NotificationFormatter.formatAdminProposalMessage(
        event.senderName,
        event.messagePreview,
      );

      await this.prisma.notification.create({
        data: {
          recipientId: event.studentId,
          subject: formatted.subject,
          body: formatted.body,
          originatingEntityType: OriginatingEntityType.PROPOSAL_MESSAGE,
          originatingEntityId: event.proposalId,
        },
      });
    } else if (event.senderRole === Role.STUDENT) {
      const adminIds = await this.getActiveAdminIds();
      if (adminIds.length === 0) return;

      const formatted = NotificationFormatter.formatStudentProposalMessage(
        event.senderName,
        event.messagePreview,
      );

      await this.prisma.notification.createMany({
        data: adminIds
          .filter((id) => id !== event.senderId)
          .map((adminId) => ({
            recipientId: adminId,
            subject: formatted.subject,
            body: formatted.body,
            originatingEntityType: OriginatingEntityType.PROPOSAL_MESSAGE,
            originatingEntityId: event.proposalId,
          })),
      });
    }
  }

  @OnEvent('verification.submitted')
  async handleVerificationSubmitted(event: VerificationSubmittedEvent) {
    const adminIds = await this.getActiveAdminIds();
    if (adminIds.length === 0) return;

    const formatted = NotificationFormatter.formatVerificationSubmitted(
      event.studentName,
      event.activityType,
      event.activityTitle,
    );

    await this.prisma.notification.createMany({
      data: adminIds.map((adminId) => ({
        recipientId: adminId,
        subject: formatted.subject,
        body: formatted.body,
        originatingEntityType: OriginatingEntityType.CHALLENGE_VERIFICATION,
        originatingEntityId: event.verificationId,
      })),
    });
  }

  @OnEvent('verification.reviewed')
  async handleVerificationReviewed(event: VerificationReviewedEvent) {
    if (!(await this.isRecipientActive(event.studentId))) return;

    let formatted = { subject: '', body: '' };
    if (event.status === VerificationStatus.ACCEPTED) {
      formatted = NotificationFormatter.formatVerificationApproved(
        event.activityType,
        event.activityTitle,
        event.pointValue ?? 0,
      );
    } else if (event.status === VerificationStatus.REJECTED) {
      formatted = NotificationFormatter.formatVerificationRejected(
        event.activityType,
        event.activityTitle,
        event.rejectionReason || 'Submission rejected by administrator',
      );
    } else {
      return;
    }

    await this.prisma.notification.create({
      data: {
        recipientId: event.studentId,
        subject: formatted.subject,
        body: formatted.body,
        originatingEntityType: OriginatingEntityType.CHALLENGE_VERIFICATION,
        originatingEntityId: event.verificationId,
      },
    });
  }

  @OnEvent('activity.ban')
  async handleActivityBan(event: ActivityBanEvent) {
    if (!(await this.isRecipientActive(event.studentId))) return;

    const formatted = NotificationFormatter.formatActivityBan(
      event.activityTitle,
      event.bannedUntil,
    );

    await this.prisma.notification.create({
      data: {
        recipientId: event.studentId,
        subject: formatted.subject,
        body: formatted.body,
        originatingEntityType: OriginatingEntityType.ACTIVITY_BAN,
        originatingEntityId: event.activityId,
      },
    });
  }

  @OnEvent('activity.unblock')
  async handleActivityUnblock(event: ActivityUnblockEvent) {
    if (!(await this.isRecipientActive(event.studentId))) return;

    const formatted = NotificationFormatter.formatActivityUnblock(
      event.activityTitle,
    );

    await this.prisma.notification.create({
      data: {
        recipientId: event.studentId,
        subject: formatted.subject,
        body: formatted.body,
        originatingEntityType: OriginatingEntityType.ACTIVITY_UNBLOCK,
        originatingEntityId: event.activityId,
      },
    });
  }

  @OnEvent('point.awarded')
  async handlePointAwarded(event: PointAwardedEvent) {
    if (!(await this.isRecipientActive(event.studentId))) return;

    const formatted = NotificationFormatter.formatPointAwarded(
      event.teacherName,
      event.amount,
      event.taskName,
    );

    await this.prisma.notification.create({
      data: {
        recipientId: event.studentId,
        subject: formatted.subject,
        body: formatted.body,
        originatingEntityType: OriginatingEntityType.POINT_AWARD,
        originatingEntityId: event.auditLogId,
      },
    });
  }

  @OnEvent('point.adjusted')
  async handlePointAdjusted(event: PointAdjustedEvent) {
    if (!(await this.isRecipientActive(event.studentId))) return;

    const formatted = NotificationFormatter.formatPointAdjusted(
      event.amount,
      event.reason,
    );

    await this.prisma.notification.create({
      data: {
        recipientId: event.studentId,
        subject: formatted.subject,
        body: formatted.body,
        originatingEntityType: OriginatingEntityType.POINT_ADJUSTMENT,
        originatingEntityId: event.auditLogId,
      },
    });
  }

  @OnEvent('point.allocated')
  async handlePointAllocated(event: PointAllocatedEvent) {
    if (!(await this.isRecipientActive(event.teacherId))) return;

    const formatted = NotificationFormatter.formatPointAllocated(
      event.amount,
      event.newBalance,
    );

    await this.prisma.notification.create({
      data: {
        recipientId: event.teacherId,
        subject: formatted.subject,
        body: formatted.body,
        originatingEntityType: OriginatingEntityType.POINT_ALLOCATION,
        originatingEntityId: event.auditLogId,
      },
    });
  }
}

