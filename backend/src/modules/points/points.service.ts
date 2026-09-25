import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditLogService } from './audit-log.service';
import {
  FundTeacherBudgetDto,
  CreatePointTaskDto,
  UpdatePointTaskDto,
  TeacherAwardPointsDto,
  AdminAdjustStudentBalanceDto,
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

@Injectable()
export class PointsService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
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

  async setPoolBalance(dto: SetPoolBalanceDto) {
    let pool = await this.prisma.systemPointPool.findFirst();
    if (!pool) {
      return this.prisma.systemPointPool.create({
        data: { balance: dto.balance },
      });
    }
    return this.prisma.systemPointPool.update({
      where: { id: pool.id },
      data: { balance: dto.balance },
    });
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

    return this.prisma.$transaction(async (tx) => {
      let pool = await tx.systemPointPool.findFirst();
      if (!pool) {
        pool = await tx.systemPointPool.create({ data: { balance: 0 } });
      }

      if (pool.balance < dto.amount) {
        throw new BadRequestException({
          statusCode: 400,
          errorCode: 'INSUFFICIENT_POOL_BALANCE',
          message: `System pool balance (${pool.balance}) is insufficient to fund ${dto.amount} points`,
        });
      }

      const updatedPool = await tx.systemPointPool.update({
        where: { id: pool.id },
        data: { balance: { decrement: dto.amount } },
      });

      const updatedTeacher = await tx.teacherProfile.update({
        where: { id: dto.teacherId },
        data: { pointBalance: { increment: dto.amount } },
      });

      await this.auditLogService.log(
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
          taskOrReason: `Admin funded teacher award budget with ${dto.amount} points`,
          resultingSourceBalance: updatedPool.balance,
          resultingRecipientBalance: updatedTeacher.pointBalance,
        },
        tx,
      );

      return {
        success: true,
        teacherId: dto.teacherId,
        awardedBudget: dto.amount,
        teacherNewBalance: updatedTeacher.pointBalance,
        poolRemainingBalance: updatedPool.balance,
      };
    });
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
  async teacherAwardPoints(
    dto: TeacherAwardPointsDto,
    teacherId: string,
    correlationId: string,
  ) {
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

    // Verify task and option
    const option = await this.prisma.pointTaskOption.findUnique({
      where: { id: dto.optionId },
      include: { task: true },
    });

    if (!option || option.taskId !== dto.taskId || !option.task.isActive) {
      throw new BadRequestException({
        statusCode: 400,
        errorCode: 'INVALID_TASK_OPTION',
        message: 'The selected point task or option is invalid or inactive',
      });
    }

    const awardPoints = option.points;

    return this.prisma.$transaction(async (tx) => {
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

      // Write immutable audit log
      await this.auditLogService.log(
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
          taskOrReason: `Awarded for ${option.task.name}: ${option.label || awardPoints + ' pts'} (${assignment.subject.name})`,
          relatedEntityType: 'TeacherClassSubjectAssignment',
          relatedEntityId: assignment.id,
          resultingSourceBalance: updatedTeacher.pointBalance,
          resultingRecipientBalance: updatedStudent.currentBalance,
        },
        tx,
      );

      return {
        success: true,
        awardedPoints: awardPoints,
        studentId: dto.studentId,
        studentNewBalance: updatedStudent.currentBalance,
        studentHighestBalance: updatedStudent.highestBalance,
        teacherRemainingBudget: updatedTeacher.pointBalance,
      };
    });
  }

  // Admin Direct Balance Adjustment (FR-023)
  async adminAdjustStudentBalance(
    dto: AdminAdjustStudentBalanceDto,
    adminId: string,
    correlationId: string,
  ) {
    const student = await this.prisma.user.findUnique({
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

    return this.prisma.$transaction(async (tx) => {
      const currentBalance = student.studentProfile!.currentBalance;
      const newBalance = currentBalance + dto.amount;

      if (newBalance < 0) {
        throw new BadRequestException({
          statusCode: 400,
          errorCode: 'INSUFFICIENT_STUDENT_BALANCE',
          message: `Deduction of ${Math.abs(dto.amount)} points exceeds student current balance (${currentBalance})`,
        });
      }

      const newHighestBalance = Math.max(
        student.studentProfile!.highestBalance,
        newBalance,
      );

      const matchingTier = await tx.tierConfiguration.findFirst({
        where: { minPointsThreshold: { lte: newBalance } },
        orderBy: { minPointsThreshold: 'desc' },
      });

      const updatedStudent = await tx.studentProfile.update({
        where: { id: dto.studentId },
        data: {
          currentBalance: newBalance,
          highestBalance: newHighestBalance,
          currentTierId: matchingTier?.id || student.studentProfile!.currentTierId,
        },
      });

      await this.auditLogService.log(
        {
          correlationId,
          actorId: adminId,
          actorRole: ActorRole.ADMIN,
          sourceType: dto.amount < 0 ? SourceType.STUDENT_CURRENT : SourceType.SYSTEM_POOL,
          sourceId: dto.amount < 0 ? dto.studentId : null,
          recipientType: dto.amount > 0 ? RecipientType.STUDENT_CURRENT : RecipientType.NONE,
          recipientId: dto.amount > 0 ? dto.studentId : null,
          amount: Math.abs(dto.amount),
          actionType: ActionType.ADMIN_ADJUST_STUDENT,
          taskOrReason: `Admin adjustment: ${dto.reason}`,
          resultingRecipientBalance: updatedStudent.currentBalance,
        },
        tx,
      );

      return {
        success: true,
        studentId: dto.studentId,
        adjustmentAmount: dto.amount,
        newCurrentBalance: updatedStudent.currentBalance,
        newHighestBalance: updatedStudent.highestBalance,
      };
    });
  }
}
