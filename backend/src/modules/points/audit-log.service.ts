import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  ActorRole,
  SourceType,
  RecipientType,
  ActionType,
  Prisma,
} from '@prisma/client';

export interface CreateAuditLogParams {
  correlationId: string;
  actorId?: string | null;
  actorRole: ActorRole;
  sourceType: SourceType;
  sourceId?: string | null;
  recipientType: RecipientType;
  recipientId?: string | null;
  amount: number;
  actionType: ActionType;
  taskOrReason: string;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  resultingSourceBalance?: number | null;
  resultingRecipientBalance?: number | null;
}

@Injectable()
export class AuditLogService {
  constructor(private prisma: PrismaService) {}

  async log(params: CreateAuditLogParams, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;
    return client.pointAuditLog.create({
      data: {
        correlationId: params.correlationId,
        actorId: params.actorId || null,
        actorRole: params.actorRole,
        sourceType: params.sourceType,
        sourceId: params.sourceId || null,
        recipientType: params.recipientType,
        recipientId: params.recipientId || null,
        amount: params.amount,
        actionType: params.actionType,
        taskOrReason: params.taskOrReason,
        relatedEntityType: params.relatedEntityType || null,
        relatedEntityId: params.relatedEntityId || null,
        resultingSourceBalance: params.resultingSourceBalance ?? null,
        resultingRecipientBalance: params.resultingRecipientBalance ?? null,
      },
    });
  }

  async findLogs(filter: {
    startDate?: Date;
    endDate?: Date;
    actorId?: string;
    studentId?: string;
    teacherId?: string;
    classId?: string;
    subjectId?: string;
    actionType?: ActionType;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};

    if (filter.startDate || filter.endDate) {
      where.createdAt = {};
      if (filter.startDate) where.createdAt.gte = filter.startDate;
      if (filter.endDate) where.createdAt.lte = filter.endDate;
    }

    if (filter.actionType) {
      where.actionType = filter.actionType;
    }

    if (filter.studentId) {
      where.OR = [
        { recipientId: filter.studentId, recipientType: { in: [RecipientType.STUDENT_CURRENT, RecipientType.STUDENT_RESERVED] } },
        { sourceId: filter.studentId, sourceType: { in: [SourceType.STUDENT_CURRENT, SourceType.STUDENT_RESERVED] } },
      ];
    } else if (filter.teacherId) {
      where.OR = [
        { recipientId: filter.teacherId, recipientType: RecipientType.TEACHER },
        { sourceId: filter.teacherId, sourceType: SourceType.TEACHER },
        { actorId: filter.teacherId },
      ];
    }

    return this.prisma.pointAuditLog.findMany({
      where,
      include: {
        actor: {
          select: {
            id: true,
            nationalId: true,
            firstName: true,
            lastName: true,
            username: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: filter.limit || 100,
      skip: filter.offset || 0,
    });
  }
}
