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
  ) {}
}

export class PointAllocatedEvent {
  constructor(
    public readonly auditLogId: string,
    public readonly teacherId: string,
    public readonly amount: number,
    public readonly newBalance: number,
  ) {}
}
