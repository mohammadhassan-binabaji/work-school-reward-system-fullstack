import { ProposalStatus, Role } from '@prisma/client';

export class ProposalStatusChangedEvent {
  constructor(
    public readonly proposalId: string,
    public readonly studentId: string,
    public readonly newStatus: ProposalStatus,
    public readonly assignedPointValue?: number | null,
    public readonly declineReason?: string | null,
  ) {}
}

export class ProposalSubmittedEvent {
  constructor(
    public readonly proposalId: string,
    public readonly studentId: string,
    public readonly studentName: string,
    public readonly proposalDescriptionSummary: string,
  ) {}
}

export class ProposalMessageEvent {
  constructor(
    public readonly proposalId: string,
    public readonly studentId: string,
    public readonly senderId: string,
    public readonly senderRole: Role,
    public readonly senderName: string,
    public readonly messagePreview: string,
  ) {}
}
