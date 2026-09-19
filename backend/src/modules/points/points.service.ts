import { Prisma } from '@prisma/client';
import { prisma } from '../../core/prisma.js';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError
} from '../../core/errors.js';
import {
  PoolTransferInput,
  CreateTaskInput,
  AwardPointsInput,
  DirectAdjustmentInput
} from './points.schemas.js';

export class PointsService {
  static async getPool() {
    let pool = await prisma.systemPointPool.findFirst();
    if (!pool) {
      pool = await prisma.systemPointPool.create({
        data: { totalAllocated: 10000, availableBalance: 10000 }
      });
    }
    return pool;
  }

  static async transferFromPool(
    input: PoolTransferInput,
    actorId: string,
    correlationId: string
  ) {
    const teacher = await prisma.teacher.findUnique({ where: { id: input.teacherId } });
    if (!teacher) {
      throw new NotFoundError('Teacher not found');
    }
    if (teacher.accountState !== 'Active') {
      throw new BadRequestError('Cannot transfer points to a non-active teacher');
    }

    return prisma.$transaction(async (tx) => {
      const pool = await tx.systemPointPool.findFirst();
      if (!pool || pool.availableBalance < input.pointAmount) {
        throw new BadRequestError(
          `Insufficient system pool balance. Available: ${pool?.availableBalance ?? 0}, Requested: ${input.pointAmount}`
        );
      }

      const updatedPool = await tx.systemPointPool.update({
        where: { id: pool.id },
        data: { availableBalance: pool.availableBalance - input.pointAmount }
      });

      const updatedTeacher = await tx.teacher.update({
        where: { id: input.teacherId },
        data: { pointBalance: teacher.pointBalance + input.pointAmount }
      });

      // Immutable AuditRecord
      await tx.auditRecord.create({
        data: {
          correlationId,
          actionType: 'POOL_TRANSFER',
          actorRole: 'ADMIN',
          actorId,
          sourceType: 'SYSTEM_POOL',
          recipientType: 'TEACHER',
          recipientId: input.teacherId,
          pointAmount: input.pointAmount,
          resultingBalanceState: JSON.stringify({
            poolAvailable: updatedPool.availableBalance,
            teacherBalance: updatedTeacher.pointBalance
          })
        }
      });

      return {
        message: 'Points transferred successfully',
        transferredAmount: input.pointAmount,
        teacherBalance: updatedTeacher.pointBalance,
        poolAvailable: updatedPool.availableBalance
      };
    });
  }

  static async createTask(input: CreateTaskInput) {
    const existing = await prisma.pointTransferTask.findUnique({
      where: { name: input.name }
    });
    if (existing) {
      throw new ConflictError(`Task with name "${input.name}" already exists`);
    }

    const uniqueOptions = Array.from(new Set(input.options)).sort((a, b) => a - b);

    return prisma.pointTransferTask.create({
      data: {
        name: input.name,
        description: input.description,
        status: 'Active',
        options: {
          create: uniqueOptions.map((opt) => ({ pointAmount: opt }))
        }
      },
      include: {
        options: {
          orderBy: { pointAmount: 'asc' }
        }
      }
    });
  }

  static async getTasks() {
    return prisma.pointTransferTask.findMany({
      where: { status: 'Active' },
      include: {
        options: {
          orderBy: { pointAmount: 'asc' }
        }
      },
      orderBy: { name: 'asc' }
    });
  }

  static async awardPoints(
    input: AwardPointsInput,
    teacherId: string,
    correlationId: string
  ) {
    return prisma.$transaction(async (tx) => {
      const teacher = await tx.teacher.findUnique({ where: { id: teacherId } });
      if (!teacher) {
        throw new NotFoundError('Teacher not found');
      }
      if (teacher.accountState !== 'Active') {
        throw new ForbiddenError('Teacher account is not active');
      }

      const task = await tx.pointTransferTask.findUnique({
        where: { id: input.taskId },
        include: { options: true }
      });
      if (!task || task.status !== 'Active') {
        throw new NotFoundError('Point transfer task not found or inactive');
      }

      const optionValid = task.options.some((opt) => opt.pointAmount === input.pointOption);
      if (!optionValid) {
        throw new BadRequestError(`Point amount ${input.pointOption} is not a valid option for task "${task.name}"`);
      }

      const student = await tx.student.findUnique({ where: { id: input.studentId } });
      if (!student) {
        throw new NotFoundError('Student not found');
      }
      if (student.accountState !== 'Active') {
        throw new BadRequestError('Cannot award points to a non-active student');
      }
      if (!student.classId) {
        throw new BadRequestError('Student is not enrolled in any class');
      }

      // Verify teacher-class assignment
      const assignment = await tx.teacherClassSubject.findFirst({
        where: {
          teacherId,
          classId: student.classId,
          assignmentState: 'Active'
        }
      });
      if (!assignment) {
        throw new ForbiddenError('Teacher is not assigned to teach the class this student belongs to');
      }

      if (teacher.pointBalance < input.pointOption) {
        throw new BadRequestError(
          `Insufficient teacher point balance. Available: ${teacher.pointBalance}, Required: ${input.pointOption}`
        );
      }

      // Deduct teacher balance
      const updatedTeacher = await tx.teacher.update({
        where: { id: teacherId },
        data: { pointBalance: teacher.pointBalance - input.pointOption }
      });

      // Add to student balance and update highestBalance
      const newCurrentPoints = student.currentPoints + input.pointOption;
      const newHighestBalance = Math.max(student.highestBalance, newCurrentPoints);

      const updatedStudent = await tx.student.update({
        where: { id: student.id },
        data: {
          currentPoints: newCurrentPoints,
          highestBalance: newHighestBalance
        }
      });

      // Re-evaluate student dynamic tier
      await this.recalculateTier(tx, student.id, newCurrentPoints);

      // Immutable AuditRecord
      await tx.auditRecord.create({
        data: {
          correlationId,
          actionType: 'TEACHER_AWARD',
          actorRole: 'TEACHER',
          actorId: teacherId,
          sourceType: 'TEACHER',
          sourceId: teacherId,
          recipientType: 'STUDENT',
          recipientId: student.id,
          pointAmount: input.pointOption,
          taskName: task.name,
          pointOption: input.pointOption,
          resultingBalanceState: JSON.stringify({
            teacherBalance: updatedTeacher.pointBalance,
            studentCurrentPoints: updatedStudent.currentPoints,
            studentHighestBalance: updatedStudent.highestBalance
          })
        }
      });

      return {
        message: 'Points awarded successfully',
        awardedPoints: input.pointOption,
        teacherRemainingBalance: updatedTeacher.pointBalance,
        student: {
          id: updatedStudent.id,
          currentPoints: updatedStudent.currentPoints,
          highestBalance: updatedStudent.highestBalance
        }
      };
    });
  }

  static async directAdjustment(
    input: DirectAdjustmentInput,
    adminId: string,
    correlationId: string
  ) {
    return prisma.$transaction(async (tx) => {
      let resultingBalanceState = '';
      let targetResult: any;

      if (input.targetType === 'STUDENT') {
        const student = await tx.student.findUnique({ where: { id: input.targetId } });
        if (!student) throw new NotFoundError('Student not found');
        if (student.accountState !== 'Active') {
          throw new BadRequestError('Cannot adjust points for a non-active student');
        }

        const newCurrentPoints = student.currentPoints + input.pointAdjustment;
        if (newCurrentPoints < 0) {
          throw new BadRequestError(
            `Adjustment rejected: resulting student point balance cannot be negative (${newCurrentPoints})`
          );
        }

        const newHighestBalance = Math.max(student.highestBalance, newCurrentPoints);
        const updated = await tx.student.update({
          where: { id: student.id },
          data: {
            currentPoints: newCurrentPoints,
            highestBalance: newHighestBalance
          }
        });

        await this.recalculateTier(tx, student.id, newCurrentPoints);

        targetResult = {
          id: updated.id,
          currentPoints: updated.currentPoints,
          highestBalance: updated.highestBalance
        };
        resultingBalanceState = JSON.stringify({
          studentId: updated.id,
          currentPoints: updated.currentPoints,
          highestBalance: updated.highestBalance
        });
      } else {
        const teacher = await tx.teacher.findUnique({ where: { id: input.targetId } });
        if (!teacher) throw new NotFoundError('Teacher not found');
        if (teacher.accountState !== 'Active') {
          throw new BadRequestError('Cannot adjust points for a non-active teacher');
        }

        const newBalance = teacher.pointBalance + input.pointAdjustment;
        if (newBalance < 0) {
          throw new BadRequestError(
            `Adjustment rejected: resulting teacher point balance cannot be negative (${newBalance})`
          );
        }

        const updated = await tx.teacher.update({
          where: { id: teacher.id },
          data: { pointBalance: newBalance }
        });

        targetResult = {
          id: updated.id,
          pointBalance: updated.pointBalance
        };
        resultingBalanceState = JSON.stringify({
          teacherId: updated.id,
          pointBalance: updated.pointBalance
        });
      }

      // Create AuditRecord
      await tx.auditRecord.create({
        data: {
          correlationId,
          actionType: 'ADMIN_ADJUSTMENT',
          actorRole: 'ADMIN',
          actorId: adminId,
          sourceType: input.pointAdjustment < 0 ? input.targetType : 'SYSTEM_POOL',
          recipientType: input.pointAdjustment > 0 ? input.targetType : 'SYSTEM_POOL',
          recipientId: input.targetId,
          pointAmount: Math.abs(input.pointAdjustment),
          reasonDescription: input.reason,
          resultingBalanceState
        }
      });

      return {
        message: 'Point adjustment completed successfully',
        pointAdjustment: input.pointAdjustment,
        reason: input.reason,
        target: targetResult
      };
    });
  }

  private static async recalculateTier(
    tx: Prisma.TransactionClient,
    studentId: string,
    currentPoints: number
  ) {
    const tiers = await tx.studentTier.findMany({
      where: { minPoints: { lte: currentPoints } },
      orderBy: { tierIndex: 'desc' }
    });
    const bestTier = tiers[0];
    if (bestTier) {
      await tx.student.update({
        where: { id: studentId },
        data: { currentTierId: bestTier.id }
      });
    }
  }
}
