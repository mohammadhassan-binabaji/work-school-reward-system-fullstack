import { ActivityType, VerificationStatus } from '@prisma/client';

export class VerificationReviewedEvent {
  constructor(
    public readonly verificationId: string,
    public readonly studentId: string,
    public readonly activityType: ActivityType,
    public readonly activityTitle: string,
    public readonly status: VerificationStatus,
    public readonly pointValue?: number,
    public readonly rejectionReason?: string | null,
  ) {}
}

export class VerificationSubmittedEvent {
  constructor(
    public readonly verificationId: string,
    public readonly studentId: string,
    public readonly studentName: string,
    public readonly activityType: ActivityType,
    public readonly activityTitle: string,
  ) {}
}

export class ActivityBanEvent {
  constructor(
    public readonly activityId: string,
    public readonly studentId: string,
    public readonly activityTitle: string,
    public readonly bannedUntil: Date | string,
  ) {}
}

export class ActivityUnblockEvent {
  constructor(
    public readonly activityId: string,
    public readonly studentId: string,
    public readonly activityTitle: string,
  ) {}
}
