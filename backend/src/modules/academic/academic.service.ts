import { prisma } from '../../core/prisma.js';
import { SessionStore } from '../../core/session.js';
import {
  BadRequestError,
  ConflictError,
  NotFoundError
} from '../../core/errors.js';
import {
  CreateClassInput,
  CreateSubjectInput,
  CreateAssignmentInput,
  UpdateTeacherStatusInput
} from './academic.schemas.js';

export class AcademicService {
  static async createClass(input: CreateClassInput) {
    const existing = await prisma.class.findUnique({
      where: { name: input.name }
    });
    if (existing) {
      throw new ConflictError(`Class with name "${input.name}" already exists`);
    }

    return prisma.class.create({
      data: {
        name: input.name,
        gradeLevel: input.gradeLevel,
        description: input.description,
        status: 'Active'
      }
    });
  }

  static async getClasses() {
    return prisma.class.findMany({
      where: { status: 'Active' },
      orderBy: { name: 'asc' }
    });
  }

  static async getStudentsByClass(classId: string) {
    const cls = await prisma.class.findUnique({ where: { id: classId } });
    if (!cls) {
      throw new NotFoundError('Class not found');
    }

    return prisma.student.findMany({
      where: {
        classId,
        accountState: 'Active'
      },
      select: {
        id: true,
        nationalId: true,
        username: true,
        firstName: true,
        lastName: true,
        accountState: true,
        currentPoints: true,
        reservedPoints: true,
        highestBalance: true,
        classId: true,
        currentTierId: true,
        createdAt: true
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }]
    });
  }

  static async createSubject(input: CreateSubjectInput) {
    const existing = await prisma.subject.findUnique({
      where: { name: input.name }
    });
    if (existing) {
      throw new ConflictError(`Subject with name "${input.name}" already exists`);
    }

    return prisma.subject.create({
      data: {
        name: input.name,
        description: input.description
      }
    });
  }

  static async getSubjects() {
    return prisma.subject.findMany({
      orderBy: { name: 'asc' }
    });
  }

  static async createAssignment(input: CreateAssignmentInput) {
    const teacher = await prisma.teacher.findUnique({ where: { id: input.teacherId } });
    if (!teacher) {
      throw new NotFoundError('Teacher not found');
    }
    if (teacher.accountState !== 'Active') {
      throw new BadRequestError('Cannot assign a non-active teacher');
    }

    const cls = await prisma.class.findUnique({ where: { id: input.classId } });
    if (!cls) {
      throw new NotFoundError('Class not found');
    }

    const subject = await prisma.subject.findUnique({ where: { id: input.subjectId } });
    if (!subject) {
      throw new NotFoundError('Subject not found');
    }

    const existing = await prisma.teacherClassSubject.findUnique({
      where: {
        teacherId_classId_subjectId: {
          teacherId: input.teacherId,
          classId: input.classId,
          subjectId: input.subjectId
        }
      }
    });

    if (existing) {
      if (existing.assignmentState === 'Active') {
        throw new ConflictError('Assignment already exists for this teacher, class, and subject');
      }
      // Re-activate previously removed assignment
      return prisma.teacherClassSubject.update({
        where: { id: existing.id },
        data: { assignmentState: 'Active' }
      });
    }

    return prisma.teacherClassSubject.create({
      data: {
        teacherId: input.teacherId,
        classId: input.classId,
        subjectId: input.subjectId,
        assignmentState: 'Active'
      }
    });
  }

  static async getAssignments(filter?: { teacherId?: string; classId?: string; subjectId?: string }) {
    return prisma.teacherClassSubject.findMany({
      where: {
        assignmentState: 'Active',
        ...(filter?.teacherId ? { teacherId: filter.teacherId } : {}),
        ...(filter?.classId ? { classId: filter.classId } : {}),
        ...(filter?.subjectId ? { subjectId: filter.subjectId } : {})
      },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true, username: true } },
        class: { select: { id: true, name: true, gradeLevel: true } },
        subject: { select: { id: true, name: true } }
      }
    });
  }

  static async removeAssignment(assignmentId: string) {
    const assignment = await prisma.teacherClassSubject.findUnique({ where: { id: assignmentId } });
    if (!assignment) {
      throw new NotFoundError('Assignment not found');
    }

    return prisma.teacherClassSubject.update({
      where: { id: assignmentId },
      data: { assignmentState: 'Removed' }
    });
  }

  static async assignStudentClass(studentId: string, classId: string) {
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      throw new NotFoundError('Student not found');
    }

    const cls = await prisma.class.findUnique({ where: { id: classId } });
    if (!cls) {
      throw new NotFoundError('Target class not found');
    }

    // Preserves points and requests (FR-009)
    return prisma.student.update({
      where: { id: studentId },
      data: { classId },
      select: {
        id: true,
        nationalId: true,
        username: true,
        firstName: true,
        lastName: true,
        classId: true,
        currentPoints: true,
        reservedPoints: true,
        highestBalance: true,
        accountState: true
      }
    });
  }

  static async markStudentDeparture(studentId: string) {
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      throw new NotFoundError('Student not found');
    }

    // Atomic transaction: zero points, cancel active requests and proposals
    const updated = await prisma.$transaction(async (tx) => {
      const s = await tx.student.update({
        where: { id: studentId },
        data: {
          accountState: 'Departed',
          currentPoints: 0,
          reservedPoints: 0
        }
      });

      // Cancel active reward requests
      await tx.rewardRequest.updateMany({
        where: {
          studentId,
          status: { in: ['Pending to Approve', 'Pending to Receive'] }
        },
        data: { status: 'Declined' }
      });

      // Cancel active task proposals
      await tx.studentTaskProposal.updateMany({
        where: {
          studentId,
          status: { in: ['Pending to Approve', 'Ready to Do'] }
        },
        data: { status: 'Canceled' }
      });

      return s;
    });

    // Immediately purge Redis sessions (FR-010)
    await SessionStore.revokeUserSessions(studentId);

    return {
      message: 'Student marked departed successfully',
      student: {
        id: updated.id,
        accountState: updated.accountState,
        currentPoints: updated.currentPoints,
        reservedPoints: updated.reservedPoints
      }
    };
  }

  static async updateTeacherStatus(teacherId: string, input: UpdateTeacherStatusInput) {
    const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
    if (!teacher) {
      throw new NotFoundError('Teacher not found');
    }

    const { status } = input;

    const updated = await prisma.$transaction(async (tx) => {
      if (status === 'Deactivated') {
        // Balance and assignments preserved (FR-012)
        return tx.teacher.update({
          where: { id: teacherId },
          data: { accountState: 'Deactivated' }
        });
      }

      if (status === 'Departed') {
        // Balance cleared to zero, assignments removed (FR-014)
        const t = await tx.teacher.update({
          where: { id: teacherId },
          data: { accountState: 'Departed', pointBalance: 0 }
        });

        await tx.teacherClassSubject.updateMany({
          where: { teacherId },
          data: { assignmentState: 'Removed' }
        });

        return t;
      }

      // Active
      return tx.teacher.update({
        where: { id: teacherId },
        data: { accountState: 'Active' }
      });
    });

    // If moved away from Active, instantly purge all active Redis sessions
    if (status !== 'Active') {
      await SessionStore.revokeUserSessions(teacherId);
    }

    return {
      id: updated.id,
      accountState: updated.accountState,
      pointBalance: updated.pointBalance
    };
  }
}
