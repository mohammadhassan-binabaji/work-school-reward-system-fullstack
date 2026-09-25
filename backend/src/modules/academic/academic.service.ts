import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreateClassDto,
  UpdateClassDto,
  CreateSubjectDto,
  UpdateSubjectDto,
  CreateAssignmentDto,
  AssignStudentClassDto,
} from './dto/academic.dto';
import {
  Role,
  AccountState,
  AssignmentStatus,
  ActionType,
  ActorRole,
  SourceType,
  RecipientType,
} from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AcademicService {
  constructor(private prisma: PrismaService) {}

  // Classes CRUD
  async createClass(dto: CreateClassDto) {
    const existing = await this.prisma.class.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException({
        statusCode: 409,
        errorCode: 'CLASS_NAME_EXISTS',
        message: `A class with name "${dto.name}" already exists`,
      });
    }

    return this.prisma.class.create({
      data: {
        name: dto.name,
        gradeLevel: dto.gradeLevel,
        description: dto.description,
      },
    });
  }

  async findAllClasses(isActive?: boolean) {
    const where: any = {};
    if (isActive !== undefined) {
      where.isActive = isActive;
    }
    return this.prisma.class.findMany({
      where,
      include: {
        _count: {
          select: { students: true, teacherAssignments: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findClassById(id: string) {
    const cls = await this.prisma.class.findUnique({
      where: { id },
      include: {
        students: {
          include: {
            user: {
              select: {
                id: true,
                nationalId: true,
                firstName: true,
                lastName: true,
                username: true,
                accountState: true,
              },
            },
            currentTier: true,
          },
        },
        teacherAssignments: {
          include: {
            teacher: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                username: true,
              },
            },
            subject: true,
          },
        },
      },
    });

    if (!cls) {
      throw new NotFoundException({
        statusCode: 404,
        errorCode: 'CLASS_NOT_FOUND',
        message: `Class with ID ${id} not found`,
      });
    }

    return cls;
  }

  async updateClass(id: string, dto: UpdateClassDto) {
    await this.findClassById(id);
    if (dto.name) {
      const duplicate = await this.prisma.class.findFirst({
        where: { name: dto.name, id: { not: id } },
      });
      if (duplicate) {
        throw new ConflictException({
          statusCode: 409,
          errorCode: 'CLASS_NAME_EXISTS',
          message: `Class name "${dto.name}" is already in use`,
        });
      }
    }

    return this.prisma.class.update({
      where: { id },
      data: dto,
    });
  }

  async deleteClass(id: string) {
    await this.findClassById(id);
    return this.prisma.class.delete({
      where: { id },
    });
  }

  // Subjects CRUD
  async createSubject(dto: CreateSubjectDto) {
    const existing = await this.prisma.subject.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException({
        statusCode: 409,
        errorCode: 'SUBJECT_NAME_EXISTS',
        message: `A subject with name "${dto.name}" already exists`,
      });
    }

    return this.prisma.subject.create({
      data: {
        name: dto.name,
        description: dto.description,
      },
    });
  }

  async findAllSubjects() {
    return this.prisma.subject.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findSubjectById(id: string) {
    const subject = await this.prisma.subject.findUnique({
      where: { id },
    });
    if (!subject) {
      throw new NotFoundException({
        statusCode: 404,
        errorCode: 'SUBJECT_NOT_FOUND',
        message: `Subject with ID ${id} not found`,
      });
    }
    return subject;
  }

  async updateSubject(id: string, dto: UpdateSubjectDto) {
    await this.findSubjectById(id);
    if (dto.name) {
      const duplicate = await this.prisma.subject.findFirst({
        where: { name: dto.name, id: { not: id } },
      });
      if (duplicate) {
        throw new ConflictException({
          statusCode: 409,
          errorCode: 'SUBJECT_NAME_EXISTS',
          message: `Subject name "${dto.name}" is already in use`,
        });
      }
    }

    return this.prisma.subject.update({
      where: { id },
      data: dto,
    });
  }

  async deleteSubject(id: string) {
    await this.findSubjectById(id);
    return this.prisma.subject.delete({
      where: { id },
    });
  }

  // Student Class Assignment & Reassignment (FR-008, FR-009)
  async assignStudentToClass(dto: AssignStudentClassDto) {
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

    const cls = await this.prisma.class.findUnique({
      where: { id: dto.classId },
    });
    if (!cls) {
      throw new NotFoundException({
        statusCode: 404,
        errorCode: 'CLASS_NOT_FOUND',
        message: 'Class not found',
      });
    }

    return this.prisma.studentProfile.update({
      where: { id: dto.studentId },
      data: { classId: dto.classId },
      include: {
        user: {
          select: {
            id: true,
            nationalId: true,
            firstName: true,
            lastName: true,
            username: true,
          },
        },
        class: true,
      },
    });
  }

  // Student Departure Lifecycle (FR-010)
  async handleStudentDeparture(studentId: string, adminId?: string, correlationId?: string) {
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      include: { studentProfile: true },
    });
    if (!student || student.role !== Role.STUDENT) {
      throw new NotFoundException({
        statusCode: 404,
        errorCode: 'STUDENT_NOT_FOUND',
        message: 'Student not found',
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const currentBalance = student.studentProfile?.currentBalance || 0;
      const reservedBalance = student.studentProfile?.reservedBalance || 0;
      const totalPointsToClear = currentBalance + reservedBalance;

      const lowestTier = await tx.tierConfiguration.findFirst({
        where: { tierNumber: 1 },
      });

      // Update student profile balances to 0 and remove class
      await tx.studentProfile.update({
        where: { id: studentId },
        data: {
          classId: null,
          currentBalance: 0,
          reservedBalance: 0,
          currentTierId: lowestTier?.id || null,
        },
      });

      // Update user accountState to DEPARTED
      await tx.user.update({
        where: { id: studentId },
        data: { accountState: AccountState.DEPARTED },
      });

      // Cancel any active reward requests and restore inventory if needed
      const pendingRequests = await tx.rewardRequest.findMany({
        where: {
          studentId,
          status: { in: ['PENDING_TO_APPROVE', 'PENDING_TO_RECEIVE'] },
        },
        include: { reward: true },
      });

      for (const req of pendingRequests) {
        await tx.rewardRequest.update({
          where: { id: req.id },
          data: {
            status: 'DECLINED',
            declineReason: 'Student departed from institution',
          },
        });

        // If non-approval and inventory was held, return inventory
        if (!req.requiresApproval && req.reward.inventoryQuantity !== null) {
          await tx.reward.update({
            where: { id: req.rewardId },
            data: { inventoryQuantity: { increment: 1 } },
          });
        }
      }

      // Cancel pending task proposals
      await tx.studentTaskProposal.updateMany({
        where: {
          studentId,
          status: { in: ['PENDING_TO_APPROVE', 'READY_TO_DO'] },
        },
        data: {
          status: 'CANCELED',
        },
      });

      // Cancel pending verification submissions
      await tx.verificationRequest.updateMany({
        where: {
          studentId,
          status: 'PENDING',
        },
        data: {
          status: 'REJECTED',
          rejectionReason: 'Student departed from institution',
        },
      });

      // Write departure audit log if points were removed
      if (totalPointsToClear > 0) {
        await tx.pointAuditLog.create({
          data: {
            correlationId: correlationId || uuidv4(),
            actorId: adminId || studentId,
            actorRole: adminId ? ActorRole.ADMIN : ActorRole.SYSTEM,
            sourceType: SourceType.STUDENT_CURRENT,
            sourceId: studentId,
            recipientType: RecipientType.NONE,
            amount: totalPointsToClear,
            actionType: ActionType.STUDENT_DEPARTURE_DEDUCT,
            taskOrReason: 'Student departure - balances cleared',
            resultingSourceBalance: 0,
          },
        });
      }

      return { success: true, message: 'Student marked as departed successfully' };
    });
  }

  // Teacher Class Subject Assignments (FR-011, FR-013, FR-081)
  async createAssignment(dto: CreateAssignmentDto) {
    const teacher = await this.prisma.user.findUnique({
      where: { id: dto.teacherId },
    });
    if (!teacher || teacher.role !== Role.TEACHER) {
      throw new BadRequestException({
        statusCode: 400,
        errorCode: 'INVALID_TEACHER',
        message: 'The specified teacher does not exist or does not have TEACHER role',
      });
    }

    const cls = await this.prisma.class.findUnique({ where: { id: dto.classId } });
    if (!cls) {
      throw new NotFoundException({
        statusCode: 404,
        errorCode: 'CLASS_NOT_FOUND',
        message: 'Class not found',
      });
    }

    const subject = await this.prisma.subject.findUnique({ where: { id: dto.subjectId } });
    if (!subject) {
      throw new NotFoundException({
        statusCode: 404,
        errorCode: 'SUBJECT_NOT_FOUND',
        message: 'Subject not found',
      });
    }

    const existing = await this.prisma.teacherClassSubjectAssignment.findUnique({
      where: {
        teacherId_classId_subjectId: {
          teacherId: dto.teacherId,
          classId: dto.classId,
          subjectId: dto.subjectId,
        },
      },
    });

    if (existing) {
      if (existing.status === AssignmentStatus.ACTIVE) {
        throw new ConflictException({
          statusCode: 409,
          errorCode: 'ASSIGNMENT_ALREADY_EXISTS',
          message: 'Teacher is already actively assigned to this class and subject',
        });
      }
      return this.prisma.teacherClassSubjectAssignment.update({
        where: { id: existing.id },
        data: { status: AssignmentStatus.ACTIVE },
        include: { teacher: true, class: true, subject: true },
      });
    }

    return this.prisma.teacherClassSubjectAssignment.create({
      data: {
        teacherId: dto.teacherId,
        classId: dto.classId,
        subjectId: dto.subjectId,
        status: AssignmentStatus.ACTIVE,
      },
      include: { teacher: true, class: true, subject: true },
    });
  }

  async findAllAssignments(teacherId?: string, classId?: string) {
    const where: any = { status: AssignmentStatus.ACTIVE };
    if (teacherId) where.teacherId = teacherId;
    if (classId) where.classId = classId;

    return this.prisma.teacherClassSubjectAssignment.findMany({
      where,
      include: {
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            accountState: true,
          },
        },
        class: true,
        subject: true,
      },
    });
  }

  async removeAssignment(id: string) {
    const assignment = await this.prisma.teacherClassSubjectAssignment.findUnique({
      where: { id },
    });
    if (!assignment) {
      throw new NotFoundException({
        statusCode: 404,
        errorCode: 'ASSIGNMENT_NOT_FOUND',
        message: 'Assignment not found',
      });
    }

    return this.prisma.teacherClassSubjectAssignment.update({
      where: { id },
      data: { status: AssignmentStatus.REMOVED },
    });
  }

  // Teacher Departure Lifecycle (FR-014)
  async handleTeacherDeparture(teacherId: string, adminId?: string, correlationId?: string) {
    const teacher = await this.prisma.user.findUnique({
      where: { id: teacherId },
      include: { teacherProfile: true },
    });
    if (!teacher || teacher.role !== Role.TEACHER) {
      throw new NotFoundException({
        statusCode: 404,
        errorCode: 'TEACHER_NOT_FOUND',
        message: 'Teacher not found',
      });
    }

    return this.prisma.$transaction(async (tx) => {
      // Mark all assignments as REMOVED
      await tx.teacherClassSubjectAssignment.updateMany({
        where: { teacherId },
        data: { status: AssignmentStatus.REMOVED },
      });

      const remainingBudget = teacher.teacherProfile?.pointBalance || 0;

      // If remaining budget > 0, return to pool and record audit log
      if (remainingBudget > 0) {
        let pool = await tx.systemPointPool.findFirst();
        if (!pool) {
          pool = await tx.systemPointPool.create({ data: { balance: 0 } });
        }

        await tx.systemPointPool.update({
          where: { id: pool.id },
          data: { balance: { increment: remainingBudget } },
        });

        await tx.teacherProfile.update({
          where: { id: teacherId },
          data: { pointBalance: 0 },
        });

        await tx.pointAuditLog.create({
          data: {
            correlationId: correlationId || uuidv4(),
            actorId: adminId || teacherId,
            actorRole: adminId ? ActorRole.ADMIN : ActorRole.SYSTEM,
            sourceType: SourceType.TEACHER,
            sourceId: teacherId,
            recipientType: RecipientType.SYSTEM_POOL,
            recipientId: pool.id,
            amount: remainingBudget,
            actionType: ActionType.POOL_FUND_TEACHER,
            taskOrReason: 'Teacher departure - unused budget returned to system pool',
            resultingSourceBalance: 0,
            resultingRecipientBalance: pool.balance + remainingBudget,
          },
        });
      }

      // Mark teacher accountState as DEPARTED
      await tx.user.update({
        where: { id: teacherId },
        data: { accountState: AccountState.DEPARTED },
      });

      return { success: true, message: 'Teacher marked as departed successfully' };
    });
  }
}
