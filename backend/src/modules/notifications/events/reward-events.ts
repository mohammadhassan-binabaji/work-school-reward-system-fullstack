import { RewardRequestStatus } from '@prisma/client';

export class RewardStatusChangedEvent {
  constructor(
    public readonly requestId: string,
    public readonly studentId: string,
    public readonly rewardName: string,
    public readonly newStatus: RewardRequestStatus,
    public readonly declineReason?: string | null,
  ) {}
}

export class RewardRequiresApprovalEvent {
  constructor(
    public readonly requestId: string,
    public readonly studentId: string,
    public readonly studentName: string,
    public readonly rewardName: string,
    public readonly priceAtRequest: number,
  ) {}
}
