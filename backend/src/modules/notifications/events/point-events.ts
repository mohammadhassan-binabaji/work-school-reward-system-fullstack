import { Role } from '@prisma/client';

export class PointAwardedEvent {
  constructor(
    public readonly auditLogId: string,
    public readonly studentId: string,
    public readonly teacherName: string,
    public readonly amount: number,
    public readonly taskName: string,
  ) {}
}

export class PointAdjustedEvent {
  constructor(
    public readonly auditLogId: string,
    public readonly studentId: string,
    public readonly amount: number,
    public readonly reason: string,
    public readonly actorRole: Extract<Role, 'ADMIN' | 'VICE_PRINCIPAL'> = Role.ADMIN,
  ) {}
}

export class PointAllocatedEvent {
  constructor(
    public readonly auditLogId: string,
    public readonly recipientId: string,
    public readonly recipientRole: Extract<Role, 'TEACHER' | 'VICE_PRINCIPAL'>,
    public readonly amount: number,
    public readonly newBalance: number,
  ) {}
}
