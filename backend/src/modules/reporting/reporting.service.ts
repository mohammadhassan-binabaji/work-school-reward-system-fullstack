import { prisma } from '../../core/prisma.js';
import { SessionData } from '../../core/session.js';
import { PointFlowQuery, ExportReportQuery, AuditRecordResponse } from './reporting.schemas.js';
import { exportToCsvStream } from './exporters/csv.exporter.js';
import { exportToExcelBuffer } from './exporters/excel.exporter.js';
import { exportToPdfBuffer } from './exporters/pdf.exporter.js';

export class ReportingService {
  async getPointFlowRecords(user: SessionData, query: PointFlowQuery): Promise<AuditRecordResponse[]> {
    const userId = user.userId;

    // 1. Role-based scoping
    let allowedStudentIds: string[] | undefined = undefined;

    if (user.role === 'STUDENT') {
      // Student only sees their own records
      allowedStudentIds = [userId];
    } else if (user.role === 'TEACHER') {
      // Teacher sees actions they performed, or records for students in their assigned classes
      const assignments = await prisma.teacherClassSubject.findMany({
        where: { teacherId: userId, assignmentState: 'Active' },
        select: { classId: true }
      });
      const assignedClassIds = assignments.map((a) => a.classId);

      const studentsInClasses = await prisma.student.findMany({
        where: { classId: { in: assignedClassIds } },
        select: { id: true }
      });
      allowedStudentIds = studentsInClasses.map((s) => s.id);

      // If teacher specified a classId, verify it's one of their assigned classes
      if (query.classId && !assignedClassIds.includes(query.classId)) {
        return [];
      }
      // If teacher specified a studentId, verify it's one of their students
      if (query.studentId && !allowedStudentIds.includes(query.studentId)) {
        return [];
      }
    }

    // 2. Resolve target student IDs if filtered by class, tier, or studentId
    const studentFilters: string[][] = [];

    if (query.classId) {
      const classStudents = await prisma.student.findMany({
        where: { classId: query.classId },
        select: { id: true }
      });
      studentFilters.push(classStudents.map((s) => s.id));
    }

    if (query.tierId) {
      const tierStudents = await prisma.student.findMany({
        where: { currentTierId: query.tierId },
        select: { id: true }
      });
      studentFilters.push(tierStudents.map((s) => s.id));
    }

    if (query.studentId) {
      studentFilters.push([query.studentId]);
    }

    let filterStudentIds: string[] | undefined = undefined;
    if (studentFilters.length > 0) {
      filterStudentIds = studentFilters.reduce((acc, curr) =>
        acc.filter((id) => curr.includes(id))
      );
    }

    // If role scoping restricted student IDs, intersect them
    if (allowedStudentIds) {
      if (filterStudentIds) {
        filterStudentIds = filterStudentIds.filter((id) => allowedStudentIds!.includes(id));
        if (filterStudentIds.length === 0) {
          return [];
        }
      } else {
        filterStudentIds = allowedStudentIds;
      }
    }

    // 3. Build Prisma where conditions via AND array
    const andConditions: any[] = [];

    if (query.startDate || query.endDate) {
      const dateCond: any = {};
      if (query.startDate) {
        dateCond.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        if (query.endDate.length <= 10) {
          end.setUTCHours(23, 59, 59, 999);
        }
        dateCond.lte = end;
      }
      andConditions.push({ eventTimestamp: dateCond });
    }

    if (query.actionType) {
      andConditions.push({ actionType: query.actionType });
    }

    if (query.rewardId) {
      andConditions.push({ relatedEntityId: query.rewardId });
    }

    if (query.subjectId) {
      andConditions.push({ relatedEntityId: query.subjectId });
    }

    if (query.teacherId) {
      andConditions.push({
        OR: [
          { actorId: query.teacherId },
          { sourceId: query.teacherId },
          { recipientId: query.teacherId }
        ]
      });
    }

    // Role-scoping conditions
    if (user.role === 'STUDENT') {
      andConditions.push({
        OR: [
          { actorId: userId },
          { sourceId: userId },
          { recipientId: userId },
          { relatedEntityId: userId }
        ]
      });
    } else if (user.role === 'TEACHER') {
      andConditions.push({
        OR: [
          { actorId: userId },
          ...(filterStudentIds && filterStudentIds.length > 0
            ? [
                { sourceId: { in: filterStudentIds } },
                { recipientId: { in: filterStudentIds } },
                { relatedEntityId: { in: filterStudentIds } }
              ]
            : [])
        ]
      });
    } else if (filterStudentIds) {
      // Admin filtered by student/class/tier
      andConditions.push({
        OR: [
          { sourceId: { in: filterStudentIds } },
          { recipientId: { in: filterStudentIds } },
          { relatedEntityId: { in: filterStudentIds } },
          { actorId: { in: filterStudentIds } }
        ]
      });
    }

    const where = andConditions.length > 0 ? { AND: andConditions } : {};

    const records = await prisma.auditRecord.findMany({
      where,
      orderBy: { eventTimestamp: 'desc' }
    });

    return records.map((r) => {
      let balanceState: any = null;
      if (r.resultingBalanceState) {
        try {
          balanceState = JSON.parse(r.resultingBalanceState);
        } catch {
          balanceState = r.resultingBalanceState;
        }
      }

      return {
        id: r.id,
        correlationId: r.correlationId,
        eventTimestamp: r.eventTimestamp.toISOString(),
        actionType: r.actionType,
        actorRole: r.actorRole,
        actorId: r.actorId,
        sourceType: r.sourceType,
        sourceId: r.sourceId,
        recipientType: r.recipientType,
        recipientId: r.recipientId,
        pointAmount: r.pointAmount,
        taskName: r.taskName,
        pointOption: r.pointOption,
        reasonDescription: r.reasonDescription,
        resultingBalanceState: balanceState
      };
    });
  }

  async exportReport(user: SessionData, query: ExportReportQuery) {
    const records = await this.getPointFlowRecords(user, query);

    switch (query.format) {
      case 'csv': {
        const stream = exportToCsvStream(records);
        return {
          contentType: 'text/csv',
          filename: 'point-flow-report.csv',
          stream
        };
      }
      case 'excel': {
        const buffer = await exportToExcelBuffer(records);
        return {
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          filename: 'point-flow-report.xlsx',
          buffer
        };
      }
      case 'pdf': {
        const buffer = await exportToPdfBuffer(records);
        return {
          contentType: 'application/pdf',
          filename: 'point-flow-report.pdf',
          buffer
        };
      }
    }
  }
}
