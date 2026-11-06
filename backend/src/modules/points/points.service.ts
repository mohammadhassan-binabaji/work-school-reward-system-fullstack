import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditLogService } from './audit-log.service';
import {
  FundTeacherBudgetDto,
  FundVicePrincipalBudgetDto,
  CreatePointTaskDto,
  UpdatePointTaskDto,
  TeacherAwardPointsDto,
  AdminAdjustStudentBalanceDto,
  ViceAdjustStudentBalanceDto,
  SetPoolBalanceDto,
} from './dto/points.dto';
import {
  Role,
  AccountState,
  AssignmentStatus,
  ActorRole,
  SourceType,
  RecipientType,
  ActionType,
  Prisma,
} from '@prisma/client';
import {
  PointAwardedEvent,
  PointAdjustedEvent,
  PointAllocatedEvent,
} from '../notifications/events/point-events';

@Injectable()
export class PointsService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
    private eventEmitter: EventEmitter2,
  ) {}

  // System Point Pool
  async getPool() {
    let pool = await this.prisma.systemPointPool.findFirst();
    if (!pool) {
      pool = await this.prisma.systemPointPool.create({
        data: { balance: 0 },
      });
    }
    return pool;
  }

  async setPoolBalance(dto: SetPoolBalanceDto, adminId?: string, correlationId?: string) {
    let pool = await this.prisma.systemPointPool.findFirst();
    if (!pool) {
      pool = await this.prisma.systemPointPool.create({
        data: { balance: dto.balance },
      });
    } else {
      pool = await this.prisma.systemPointPool.update({
        where: { id: pool.id },
        data: { balance: dto.balance },
      });
    }

    if (correlationId) {
      let adminName: string | undefined;
      if (adminId) {
        const admin = await this.prisma.user.findUnique({ where: { id: adminId } });
        if (admin) adminName = `${admin.firstName} ${admin.lastName}`.trim();
      }

      await this.auditLogService.log({
        correlationId,
        actorId: adminId || null,
        actorRole: ActorRole.ADMIN,
        sourceType: SourceType.SYSTEM_POOL,
        sourceId: pool.id,
        recipientType: RecipientType.SYSTEM_POOL,
        recipientId: pool.id,
        amount: dto.balance,
        actionType: ActionType.SET_POOL_BALANCE,
        metadata: adminName ? { adminName } : null,
        resultingRecipientBalance: pool.balance,
      });
    }

    return pool;
  }

  // Fund Teacher Budget (FR-015, FR-016)
  async fundTeacherBudget(dto: FundTeacherBudgetDto, adminId: string, correlationId: string) {
    const teacher = await this.prisma.user.findUnique({
      where: { id: dto.teacherId },
      include: { teacherProfile: true },
    });

    if (!teacher || teacher.role !== Role.TEACHER || !teacher.teacherProfile) {
      throw new NotFoundException({
        statusCode: 404,
        errorCode: 'TEACHER_NOT_FOUND',
        message: 'Teacher profile not found',
      });
    }

    if (teacher.accountState !== AccountState.ACTIVE) {
      throw new BadRequestException({
        statusCode: 400,
        errorCode: 'TEACHER_NOT_ACTIVE',
        message: 'Cannot fund inactive or departed teacher',
      });
    }

    const result = await this.prisma.$transaction(async (tx) => {
      let pool = await tx.systemPointPool.findFirst();
      if (!pool) {
        pool = await tx.systemPointPool.create({ data: { balance: 0 } });
      }

      const debitedPool = await tx.systemPointPool.updateMany({
        where: { id: pool.id, balance: { gte: dto.amount } },
        data: { balance: { decrement: dto.amount } },
      });

      if (debitedPool.count !== 1) {
        const currentPool = await tx.systemPointPool.findUnique({
          where: { id: pool.id },
          select: { balance: true },
        });
        throw new BadRequestException({
          statusCode: 400,
          errorCode: 'INSUFFICIENT_POOL_BALANCE',
          message: `System pool balance (${currentPool?.balance || 0}) is insufficient to fund ${dto.amount} points`,
        });
      }

      const updatedPool = await tx.systemPointPool.findUniqueOrThrow({
        where: { id: pool.id },
      });

      const updatedTeacher = await tx.teacherProfile.update({
        where: { id: dto.teacherId },
        data: { pointBalance: { increment: dto.amount } },
      });

      const admin = await tx.user.findUnique({ where: { id: adminId } });
      const adminName = admin ? `${admin.firstName} ${admin.lastName}`.trim() : 'مدیر';
      const teacherName = `${teacher.firstName} ${teacher.lastName}`.trim();

      const auditLog = await this.auditLogService.log(
        {
          correlationId,
          actorId: adminId,
          actorRole: ActorRole.ADMIN,
          sourceType: SourceType.SYSTEM_POOL,
          sourceId: pool.id,
          recipientType: RecipientType.TEACHER,
          recipientId: dto.teacherId,
          amount: dto.amount,
          actionType: ActionType.POOL_FUND_TEACHER,
          metadata: { adminName, teacherName },
          resultingSourceBalance: updatedPool.balance,
          resultingRecipientBalance: updatedTeacher.pointBalance,
        },
        tx,
      );

      return {
        auditLogId: auditLog.id,
        success: true,
        teacherId: dto.teacherId,
        awardedBudget: dto.amount,
        teacherNewBalance: updatedTeacher.pointBalance,
        poolRemainingBalance: updatedPool.balance,
      };
    });

    await this.eventEmitter.emitAsync(
      'point.allocated',
      new PointAllocatedEvent(
        result.auditLogId,
        result.teacherId,
        Role.TEACHER,
        result.awardedBudget,
        result.teacherNewBalance,
      ),
    );

    const { auditLogId, ...response } = result;
    return response;
  }

  // Fund Vice Principal Budget
  async fundVicePrincipalBudget(
    dto: FundVicePrincipalBudgetDto,
    adminId: string,
    correlationId: string,
  ) {
    const vp = await this.prisma.user.findUnique({
      where: { id: dto.vicePrincipalId },
      include: { teacherProfile: true },
    });

    if (!vp || vp.role !== Role.VICE_PRINCIPAL || !vp.teacherProfile) {
      throw new NotFoundException({
        statusCode: 404,
        errorCode: 'VICE_PRINCIPAL_NOT_FOUND',
        message: 'Vice Principal profile not found',
      });
    }

    if (vp.accountState !== AccountState.ACTIVE) {
      throw new BadRequestException({
        statusCode: 400,
        errorCode: 'VICE_PRINCIPAL_NOT_ACTIVE',
        message: 'Cannot fund inactive or departed vice principal',
      });
    }

    const result = await this.prisma.$transaction(async (tx) => {
      let pool = await tx.systemPointPool.findFirst();
      if (!pool) {
        pool = await tx.systemPointPool.create({ data: { balance: 0 } });
      }

      const debitedPool = await tx.systemPointPool.updateMany({
        where: { id: pool.id, balance: { gte: dto.amount } },
        data: { balance: { decrement: dto.amount } },
      });

      if (debitedPool.count !== 1) {
        const currentPool = await tx.systemPointPool.findUnique({
          where: { id: pool.id },
          select: { balance: true },
        });
        throw new BadRequestException({
          statusCode: 400,
          errorCode: 'INSUFFICIENT_POOL_BALANCE',
          message: `System pool balance (${currentPool?.balance || 0}) is insufficient to fund ${dto.amount} points`,
        });
      }

      const updatedPool = await tx.systemPointPool.findUniqueOrThrow({
        where: { id: pool.id },
      });

      const updatedVp = await tx.teacherProfile.update({
        where: { id: dto.vicePrincipalId },
        data: { pointBalance: { increment: dto.amount } },
      });

      const admin = await tx.user.findUnique({ where: { id: adminId } });
      const adminName = admin ? `${admin.firstName} ${admin.lastName}`.trim() : 'مدیر';
      const vpName = `${vp.firstName} ${vp.lastName}`.trim();

      const auditLog = await this.auditLogService.log(
        {
          correlationId,
          actorId: adminId,
          actorRole: ActorRole.ADMIN,
          sourceType: SourceType.SYSTEM_POOL,
          sourceId: pool.id,
          recipientType: RecipientType.VICE_PRINCIPAL,
          recipientId: dto.vicePrincipalId,
          amount: dto.amount,
          actionType: ActionType.POOL_FUND_VICE_PRINCIPAL,
          metadata: { adminName, vicePrincipalName: vpName },
          resultingSourceBalance: updatedPool.balance,
          resultingRecipientBalance: updatedVp.pointBalance,
        },
        tx,
      );

      return {
        auditLogId: auditLog.id,
        success: true,
        vicePrincipalId: dto.vicePrincipalId,
        awardedBudget: dto.amount,
        vicePrincipalNewBalance: updatedVp.pointBalance,
        poolRemainingBalance: updatedPool.balance,
      };
    });

    await this.eventEmitter.emitAsync(
      'point.allocated',
      new PointAllocatedEvent(
        result.auditLogId,
        result.vicePrincipalId,
        Role.VICE_PRINCIPAL,
        result.awardedBudget,
        result.vicePrincipalNewBalance,
      ),
    );

    const { auditLogId, ...response } = result;
    return response;
  }

  // Predefined Point Transfer Tasks (FR-017)
  async createTask(dto: CreatePointTaskDto) {
    const existing = await this.prisma.pointTransferTask.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException({
        statusCode: 409,
        errorCode: 'TASK_NAME_EXISTS',
        message: `Task with name "${dto.name}" already exists`,
      });
    }

    return this.prisma.pointTransferTask.create({
      data: {
        name: dto.name,
        description: dto.description,
        options: {
          create: dto.options.map((opt) => ({
            points: opt.points,
            label: opt.label,
          })),
        },
      },
      include: { options: true },
    });
  }

  async findAllTasks(isActive?: boolean) {
    const where: any = {};
    if (isActive !== undefined) {
      where.isActive = isActive;
    }
    return this.prisma.pointTransferTask.findMany({
      where,
      include: { options: true },
      orderBy: { name: 'asc' },
    });
  }

  async findTaskById(id: string) {
    const task = await this.prisma.pointTransferTask.findUnique({
      where: { id },
      include: { options: true },
    });
    if (!task) {
      throw new NotFoundException({
        statusCode: 404,
        errorCode: 'TASK_NOT_FOUND',
        message: `Task with ID ${id} not found`,
      });
    }
    return task;
  }

  async updateTask(id: string, dto: UpdatePointTaskDto) {
    await this.findTaskById(id);
    return this.prisma.pointTransferTask.update({
      where: { id },
      data: dto,
      include: { options: true },
    });
  }

  async deleteTask(id: string) {
    await this.findTaskById(id);
    return this.prisma.pointTransferTask.delete({
      where: { id },
    });
  }

  // Teacher Awards Points to Student (FR-018 - FR-022)
  async teacherAwardPoints(dto: TeacherAwardPointsDto, teacherId: string, correlationId: string) {
    // Verify teacher assignment to this class and subject
    const assignment = await this.prisma.teacherClassSubjectAssignment.findFirst({
      where: {
        teacherId,
        classId: dto.classId,
        subjectId: dto.subjectId,
        status: AssignmentStatus.ACTIVE,
      },
      include: { subject: true },
    });

    if (!assignment) {
      throw new ForbiddenException({
        statusCode: 403,
        errorCode: 'UNAUTHORIZED_CLASS_ASSIGNMENT',
        message: 'Teacher is not actively assigned to this class and subject',
      });
    }

    // Verify student is enrolled in the assigned class and is active
    const student = await this.prisma.user.findUnique({
      where: { id: dto.studentId },
      include: { studentProfile: true },
    });

    if (
      !student ||
      student.role !== Role.STUDENT ||
      !student.studentProfile ||
      student.studentProfile.classId !== dto.classId ||
      student.accountState !== AccountState.ACTIVE
    ) {
      throw new BadRequestException({
        statusCode: 400,
        errorCode: 'INVALID_STUDENT_FOR_CLASS',
        message: 'Student is not actively enrolled in the specified class',
      });
    }

    const awardPoints = dto.amount;

    const teacherUser = await this.prisma.user.findUnique({
      where: { id: teacherId },
    });
    const teacherName = teacherUser
      ? `${teacherUser.firstName} ${teacherUser.lastName}`
      : 'Teacher';

    const result = await this.prisma.$transaction(async (tx) => {
      const teacherProfile = await tx.teacherProfile.findUnique({
        where: { id: teacherId },
      });

      if (!teacherProfile || teacherProfile.pointBalance < awardPoints) {
        throw new BadRequestException({
          statusCode: 400,
          errorCode: 'INSUFFICIENT_TEACHER_BUDGET',
          message: `Insufficient teacher point budget. Required: ${awardPoints}, Available: ${teacherProfile?.pointBalance || 0}`,
        });
      }

      // Deduct from teacher budget
      const updatedTeacher = await tx.teacherProfile.update({
        where: { id: teacherId },
        data: { pointBalance: { decrement: awardPoints } },
      });

      const currentStudentProfile = await tx.studentProfile.findUnique({
        where: { id: dto.studentId },
      });

      const newCurrentBalance = (currentStudentProfile?.currentBalance || 0) + awardPoints;
      const newHighestBalance = Math.max(
        currentStudentProfile?.highestBalance || 0,
        newCurrentBalance,
      );

      // Re-evaluate tier
      const matchingTier = await tx.tierConfiguration.findFirst({
        where: { minPointsThreshold: { lte: newCurrentBalance } },
        orderBy: { minPointsThreshold: 'desc' },
      });

      const updatedStudent = await tx.studentProfile.update({
        where: { id: dto.studentId },
        data: {
          currentBalance: newCurrentBalance,
          highestBalance: newHighestBalance,
          currentTierId: matchingTier?.id || currentStudentProfile?.currentTierId,
        },
      });

      const metadata: Record<string, any> = {
        teacherName,
        subjectName: assignment.subject.name,
      };
      if (dto.description) {
        metadata.description = dto.description;
      }

      // Write immutable audit log
      const auditLog = await this.auditLogService.log(
        {
          correlationId,
          actorId: teacherId,
          actorRole: ActorRole.TEACHER,
          sourceType: SourceType.TEACHER,
          sourceId: teacherId,
          recipientType: RecipientType.STUDENT_CURRENT,
          recipientId: dto.studentId,
          amount: awardPoints,
          actionType: ActionType.TEACHER_AWARD_STUDENT,
          reasonDetail: dto.reason,
          relatedEntityType: 'TeacherClassSubjectAssignment',
          relatedEntityId: assignment.id,
          metadata,
          resultingSourceBalance: updatedTeacher.pointBalance,
          resultingRecipientBalance: updatedStudent.currentBalance,
        },
        tx,
      );

      return {
        auditLogId: auditLog.id,
        success: true,
        awardedPoints: awardPoints,
        studentId: dto.studentId,
        studentNewBalance: updatedStudent.currentBalance,
        studentHighestBalance: updatedStudent.highestBalance,
        teacherRemainingBudget: updatedTeacher.pointBalance,
      };
    });

    await this.eventEmitter.emitAsync(
      'point.awarded',
      new PointAwardedEvent(
        result.auditLogId,
        result.studentId,
        teacherName,
        result.awardedPoints,
        dto.reason,
      ),
    );

    const { auditLogId, ...response } = result;
    return response;
  }

  // Admin Direct Balance Adjustment (FR-023)
  async adminAdjustStudentBalance(
    dto: AdminAdjustStudentBalanceDto,
    adminId: string,
    correlationId: string,
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      const student = await tx.user.findUnique({
        where: { id: dto.studentId },
        include: { studentProfile: true },
      });

      if (!student || student.role !== Role.STUDENT || !student.studentProfile) {
        throw new NotFoundException({
          statusCode: 404,
          errorCode: 'STUDENT_NOT_FOUND',
          message: 'Student account not found',
        });
      }

      let pool = await tx.systemPointPool.findFirst();
      if (!pool) {
        pool = await tx.systemPointPool.create({ data: { balance: 0 } });
      }

      let updatedPool = pool;
      if (dto.amount > 0) {
        const debitedPool = await tx.systemPointPool.updateMany({
          where: { id: pool.id, balance: { gte: dto.amount } },
          data: { balance: { decrement: dto.amount } },
        });

        if (debitedPool.count !== 1) {
          throw new BadRequestException({
            statusCode: 400,
            errorCode: 'INSUFFICIENT_POOL_BALANCE',
            message: `System pool balance is insufficient to award ${dto.amount} points`,
          });
        }

        updatedPool = await tx.systemPointPool.findUniqueOrThrow({
          where: { id: pool.id },
        });
      } else {
        updatedPool = await tx.systemPointPool.update({
          where: { id: pool.id },
          data: { balance: { increment: Math.abs(dto.amount) } },
        });
      }

      const currentBalance = student.studentProfile.currentBalance;
      const newBalance = currentBalance + dto.amount;

      if (newBalance < 0) {
        throw new BadRequestException({
          statusCode: 400,
          errorCode: 'INSUFFICIENT_STUDENT_BALANCE',
          message: `Deduction of ${Math.abs(dto.amount)} points exceeds student current balance (${currentBalance})`,
        });
      }

      const newHighestBalance = Math.max(student.studentProfile.highestBalance, newBalance);

      const matchingTier = await tx.tierConfiguration.findFirst({
        where: { minPointsThreshold: { lte: newBalance } },
        orderBy: { minPointsThreshold: 'desc' },
      });

      const lowestTier = await tx.tierConfiguration.findFirst({
        where: { tierNumber: 1 },
      });

      const updatedStudent = await tx.studentProfile.update({
        where: { id: dto.studentId },
        data: {
          currentBalance: newBalance,
          highestBalance: newHighestBalance,
          currentTierId: matchingTier?.id || lowestTier?.id || student.studentProfile.currentTierId,
        },
      });

      const admin = await tx.user.findUnique({ where: { id: adminId } });
      const adminName = admin ? `${admin.firstName} ${admin.lastName}`.trim() : 'مدیر';

      const auditLog = await this.auditLogService.log(
        {
          correlationId,
          actorId: adminId,
          actorRole: ActorRole.ADMIN,
          sourceType: dto.amount < 0 ? SourceType.STUDENT_CURRENT : SourceType.SYSTEM_POOL,
          sourceId: dto.amount < 0 ? dto.studentId : pool.id,
          recipientType: dto.amount > 0 ? RecipientType.STUDENT_CURRENT : RecipientType.SYSTEM_POOL,
          recipientId: dto.amount > 0 ? dto.studentId : pool.id,
          amount: Math.abs(dto.amount),
          actionType: ActionType.ADMIN_ADJUST_STUDENT,
          reasonDetail: dto.reason,
          metadata: { adminName },
          resultingSourceBalance:
            dto.amount < 0 ? updatedStudent.currentBalance : updatedPool.balance,
          resultingRecipientBalance:
            dto.amount > 0 ? updatedStudent.currentBalance : updatedPool.balance,
        },
        tx,
      );

      return {
        auditLogId: auditLog.id,
        success: true,
        studentId: dto.studentId,
        adjustmentAmount: dto.amount,
        newCurrentBalance: updatedStudent.currentBalance,
        newHighestBalance: updatedStudent.highestBalance,
      };
    });

    await this.eventEmitter.emitAsync(
      'point.adjusted',
      new PointAdjustedEvent(
        result.auditLogId,
        result.studentId,
        result.adjustmentAmount,
        dto.reason,
        Role.ADMIN,
      ),
    );

    const { auditLogId, ...response } = result;
    return response;
  }

  // Vice Principal Direct Balance Adjustment
  async viceAdjustStudentBalance(
    dto: ViceAdjustStudentBalanceDto,
    vicePrincipalId: string,
    correlationId: string,
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      const student = await tx.user.findUnique({
        where: { id: dto.studentId },
        include: { studentProfile: true },
      });

      if (!student || student.role !== Role.STUDENT || !student.studentProfile) {
        throw new NotFoundException({
          statusCode: 404,
          errorCode: 'STUDENT_NOT_FOUND',
          message: 'Student account not found',
        });
      }

      if (student.accountState !== AccountState.ACTIVE) {
        throw new BadRequestException({
          statusCode: 400,
          errorCode: 'STUDENT_NOT_ACTIVE',
          message: 'Cannot adjust balance of inactive student',
        });
      }

      const vp = await tx.user.findUnique({
        where: { id: vicePrincipalId },
        include: { teacherProfile: true },
      });

      if (!vp || vp.role !== Role.VICE_PRINCIPAL || !vp.teacherProfile) {
        throw new NotFoundException({
          statusCode: 404,
          errorCode: 'VICE_PRINCIPAL_NOT_FOUND',
          message: 'Vice Principal profile not found',
        });
      }

      if (vp.accountState !== AccountState.ACTIVE) {
        throw new BadRequestException({
          statusCode: 400,
          errorCode: 'VICE_PRINCIPAL_NOT_ACTIVE',
          message: 'Cannot adjust balance when vice principal is inactive or departed',
        });
      }

      const absAmount = Math.abs(dto.amount);

      if (dto.amount > 0) {
        // Credit student, debit VP
        const debitedVicePrincipal = await tx.teacherProfile.updateMany({
          where: {
            id: vicePrincipalId,
            pointBalance: { gte: absAmount },
          },
          data: { pointBalance: { decrement: absAmount } },
        });

        if (debitedVicePrincipal.count !== 1) {
          const currentBalance = await tx.teacherProfile.findUnique({
            where: { id: vicePrincipalId },
            select: { pointBalance: true },
          });
          throw new BadRequestException({
            statusCode: 400,
            errorCode: 'INSUFFICIENT_VICE_PRINCIPAL_BALANCE',
            message: `Vice Principal point balance (${currentBalance?.pointBalance || 0}) is insufficient to award ${absAmount} points`,
          });
        }

        await tx.studentProfile.update({
          where: { id: dto.studentId },
          data: { currentBalance: { increment: absAmount } },
        });
      } else {
        // Debit student, credit VP
        const debitedStudent = await tx.studentProfile.updateMany({
          where: {
            id: dto.studentId,
            currentBalance: { gte: absAmount },
          },
          data: { currentBalance: { decrement: absAmount } },
        });

        if (debitedStudent.count !== 1) {
          const currentBalance = await tx.studentProfile.findUnique({
            where: { id: dto.studentId },
            select: { currentBalance: true },
          });
          throw new BadRequestException({
            statusCode: 400,
            errorCode: 'INSUFFICIENT_STUDENT_BALANCE',
            message: `Deduction of ${absAmount} points exceeds student current balance (${currentBalance?.currentBalance || 0})`,
          });
        }

        await tx.teacherProfile.update({
          where: { id: vicePrincipalId },
          data: { pointBalance: { increment: absAmount } },
        });
      }

      const updatedVp = await tx.teacherProfile.findUniqueOrThrow({
        where: { id: vicePrincipalId },
      });
      const currentStudentProfile = await tx.studentProfile.findUniqueOrThrow({
        where: { id: dto.studentId },
      });
      const newStudentBalance = currentStudentProfile.currentBalance;
      const newHighestBalance = Math.max(
        currentStudentProfile.highestBalance,
        newStudentBalance,
      );

      const matchingTier = await tx.tierConfiguration.findFirst({
        where: { minPointsThreshold: { lte: newStudentBalance } },
        orderBy: { minPointsThreshold: 'desc' },
      });

      const lowestTier = await tx.tierConfiguration.findFirst({
        where: { tierNumber: 1 },
      });

      const updatedStudent = await tx.studentProfile.update({
        where: { id: dto.studentId },
        data: {
          highestBalance: newHighestBalance,
          currentTierId:
            matchingTier?.id || lowestTier?.id || currentStudentProfile.currentTierId,
        },
      });

      const vpName = `${vp.firstName} ${vp.lastName}`.trim();
      const studentName = `${student.firstName} ${student.lastName}`.trim();

      const auditLog = await this.auditLogService.log(
        {
          correlationId,
          actorId: vicePrincipalId,
          actorRole: ActorRole.VICE_PRINCIPAL,
          sourceType: dto.amount > 0 ? SourceType.VICE_PRINCIPAL : SourceType.STUDENT_CURRENT,
          sourceId: dto.amount > 0 ? vicePrincipalId : dto.studentId,
          recipientType: dto.amount > 0 ? RecipientType.STUDENT_CURRENT : RecipientType.VICE_PRINCIPAL,
          recipientId: dto.amount > 0 ? dto.studentId : vicePrincipalId,
          amount: absAmount,
          actionType: ActionType.VICE_ADJUST_STUDENT,
          reasonDetail: dto.reason,
          metadata: { vicePrincipalName: vpName, studentName },
          resultingSourceBalance: dto.amount > 0 ? updatedVp.pointBalance : updatedStudent.currentBalance,
          resultingRecipientBalance: dto.amount > 0 ? updatedStudent.currentBalance : updatedVp.pointBalance,
        },
        tx,
      );

      return {
        auditLogId: auditLog.id,
        success: true,
        studentId: dto.studentId,
        adjustmentAmount: dto.amount,
        newCurrentBalance: updatedStudent.currentBalance,
        newHighestBalance: updatedStudent.highestBalance,
        vicePrincipalRemainingBalance: updatedVp.pointBalance,
      };
    });

    await this.eventEmitter.emitAsync(
      'point.adjusted',
      new PointAdjustedEvent(
        result.auditLogId,
        result.studentId,
        result.adjustmentAmount,
        dto.reason,
        Role.VICE_PRINCIPAL,
      ),
    );

    const { auditLogId, ...response } = result;
    return response;
  }
}
