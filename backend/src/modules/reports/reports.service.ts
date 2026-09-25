import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ActionType, Role, RecipientType, SourceType } from '@prisma/client';
import { ExportUtil, AuditLogExportRow } from '../../common/utils/export.util';

export interface PointFlowQueryFilter {
  startDate?: string;
  endDate?: string;
  studentId?: string;
  teacherId?: string;
  classId?: string;
  subjectId?: string;
  actionType?: ActionType;
  limit?: number;
  offset?: number;
}

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getPointFlowReport(filter: PointFlowQueryFilter, currentUser: { id: string; role: Role }) {
    const where = await this.buildScopedWhereClause(filter, currentUser);

    const logs = await this.prisma.pointAuditLog.findMany({
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
      take: filter.limit ? Number(filter.limit) : 100,
      skip: filter.offset ? Number(filter.offset) : 0,
    });

    const total = await this.prisma.pointAuditLog.count({ where });

    return {
      total,
      limit: filter.limit ? Number(filter.limit) : 100,
      offset: filter.offset ? Number(filter.offset) : 0,
      data: logs,
    };
  }

  async exportPointFlowReport(
    filter: PointFlowQueryFilter,
    currentUser: { id: string; role: Role },
    format: 'csv' | 'xlsx' | 'pdf',
  ): Promise<{ buffer: Buffer | string; contentType: string; filename: string }> {
    const where = await this.buildScopedWhereClause(filter, currentUser);

    const logs = await this.prisma.pointAuditLog.findMany({
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
    });

    const rows: AuditLogExportRow[] = logs.map((log) => ({
      timestamp: log.createdAt.toISOString(),
      actionType: log.actionType,
      actor: log.actor
        ? `${log.actor.firstName} ${log.actor.lastName} (${log.actor.username})`
        : 'SYSTEM',
      source: log.sourceType,
      recipient: log.recipientType,
      amount: log.amount,
      reason: log.taskOrReason,
      correlationId: log.correlationId,
    }));

    const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');

    if (format === 'csv') {
      const csvData = await ExportUtil.generateCsv(rows);
      return {
        buffer: csvData,
        contentType: 'text/csv',
        filename: `point-flow-report-${timestampStr}.csv`,
      };
    } else if (format === 'xlsx') {
      const xlsxBuffer = await ExportUtil.generateXlsx(rows);
      return {
        buffer: xlsxBuffer,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        filename: `point-flow-report-${timestampStr}.xlsx`,
      };
    } else if (format === 'pdf') {
      const pdfBuffer = await ExportUtil.generatePdf(rows);
      return {
        buffer: pdfBuffer,
        contentType: 'application/pdf',
        filename: `point-flow-report-${timestampStr}.pdf`,
      };
    }

    throw new ForbiddenException('Unsupported export format');
  }

  private async buildScopedWhereClause(
    filter: PointFlowQueryFilter,
    currentUser: { id: string; role: Role },
  ): Promise<any> {
    const where: any = {};

    // Date range
    if (filter.startDate || filter.endDate) {
      where.createdAt = {};
      if (filter.startDate) where.createdAt.gte = new Date(filter.startDate);
      if (filter.endDate) where.createdAt.lte = new Date(filter.endDate);
    }

    if (filter.actionType) {
      where.actionType = filter.actionType;
    }

    // Role-based visibility scoping
    if (currentUser.role === Role.STUDENT) {
      // Student can ONLY see their own logs
      where.OR = [
        {
          recipientId: currentUser.id,
          recipientType: { in: [RecipientType.STUDENT_CURRENT, RecipientType.STUDENT_RESERVED] },
        },
        {
          sourceId: currentUser.id,
          sourceType: { in: [SourceType.STUDENT_CURRENT, SourceType.STUDENT_RESERVED] },
        },
        { actorId: currentUser.id },
      ];
    } else if (currentUser.role === Role.TEACHER) {
      // Teacher can see logs related to their assigned students or actions performed by the teacher
      const assignments = await this.prisma.teacherClassSubjectAssignment.findMany({
        where: { teacherId: currentUser.id, status: 'ACTIVE' },
        select: { classId: true },
      });
      const assignedClassIds = assignments.map((a) => a.classId);

      const assignedStudents = await this.prisma.studentProfile.findMany({
        where: { classId: { in: assignedClassIds } },
        select: { id: true },
      });
      const studentIds = assignedStudents.map((s) => s.id);

      const teacherConditions: any[] = [
        { actorId: currentUser.id },
        { sourceId: currentUser.id, sourceType: SourceType.TEACHER },
        { recipientId: currentUser.id, recipientType: RecipientType.TEACHER },
      ];

      if (studentIds.length > 0) {
        teacherConditions.push({
          recipientId: { in: studentIds },
          recipientType: { in: [RecipientType.STUDENT_CURRENT, RecipientType.STUDENT_RESERVED] },
        });
      }

      where.OR = teacherConditions;
    } else if (currentUser.role === Role.ADMIN) {
      // School-wide admin filters
      if (filter.studentId) {
        where.OR = [
          {
            recipientId: filter.studentId,
            recipientType: { in: [RecipientType.STUDENT_CURRENT, RecipientType.STUDENT_RESERVED] },
          },
          {
            sourceId: filter.studentId,
            sourceType: { in: [SourceType.STUDENT_CURRENT, SourceType.STUDENT_RESERVED] },
          },
        ];
      } else if (filter.teacherId) {
        where.OR = [
          { recipientId: filter.teacherId, recipientType: RecipientType.TEACHER },
          { sourceId: filter.teacherId, sourceType: SourceType.TEACHER },
          { actorId: filter.teacherId },
        ];
      } else if (filter.classId) {
        const classStudents = await this.prisma.studentProfile.findMany({
          where: { classId: filter.classId },
          select: { id: true },
        });
        const classStudentIds = classStudents.map((s) => s.id);
        where.recipientId = { in: classStudentIds };
      }
    }

    return where;
  }
}
