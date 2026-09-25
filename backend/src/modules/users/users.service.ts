import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { PasswordService } from '../auth/password.service';
import { AcademicService } from '../academic/academic.service';
import { CreateUserDto, UpdateUserStateDto } from './dto/user.dto';
import { Role, AccountState } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private passwordService: PasswordService,
    private academicService: AcademicService,
  ) {}

  async createUser(dto: CreateUserDto) {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ nationalId: dto.nationalId }, { username: dto.username }],
      },
    });

    if (existing) {
      if (existing.nationalId === dto.nationalId) {
        throw new ConflictException({
          statusCode: 409,
          errorCode: 'DUPLICATE_NATIONAL_ID',
          message: 'A user with this National ID already exists',
        });
      }
      throw new ConflictException({
        statusCode: 409,
        errorCode: 'DUPLICATE_USERNAME',
        message: 'A user with this username already exists',
      });
    }

    if (dto.role === Role.STUDENT && dto.classId) {
      const cls = await this.prisma.class.findUnique({
        where: { id: dto.classId },
      });
      if (!cls) {
        throw new BadRequestException({
          statusCode: 400,
          errorCode: 'CLASS_NOT_FOUND',
          message: 'The specified class does not exist',
        });
      }
    }

    const hashedPassword = await this.passwordService.hash(dto.password);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          nationalId: dto.nationalId,
          firstName: dto.firstName,
          lastName: dto.lastName,
          username: dto.username,
          passwordHash: hashedPassword,
          role: dto.role,
          accountState: dto.accountState || AccountState.ACTIVE,
        },
      });

      if (dto.role === Role.TEACHER) {
        await tx.teacherProfile.create({
          data: {
            id: user.id,
            pointBalance: 0,
          },
        });
      } else if (dto.role === Role.STUDENT) {
        const lowestTier = await tx.tierConfiguration.findFirst({
          where: { tierNumber: 1 },
        });

        await tx.studentProfile.create({
          data: {
            id: user.id,
            classId: dto.classId || null,
            currentBalance: 0,
            reservedBalance: 0,
            highestBalance: 0,
            currentTierId: lowestTier?.id || null,
          },
        });
      }

      return tx.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          nationalId: true,
          firstName: true,
          lastName: true,
          username: true,
          role: true,
          accountState: true,
          teacherProfile: true,
          studentProfile: {
            include: {
              class: true,
              currentTier: true,
            },
          },
          createdAt: true,
          updatedAt: true,
        },
      });
    });
  }

  async findAll(role?: Role, accountState?: AccountState) {
    const where: any = {};
    if (role) where.role = role;
    if (accountState) where.accountState = accountState;

    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        nationalId: true,
        firstName: true,
        lastName: true,
        username: true,
        role: true,
        accountState: true,
        teacherProfile: true,
        studentProfile: {
          include: {
            class: true,
            currentTier: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        nationalId: true,
        firstName: true,
        lastName: true,
        username: true,
        role: true,
        accountState: true,
        teacherProfile: true,
        studentProfile: {
          include: {
            class: true,
            currentTier: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException({
        statusCode: 404,
        errorCode: 'USER_NOT_FOUND',
        message: `User with ID ${id} not found`,
      });
    }

    return user;
  }

  async updateUserState(
    id: string,
    dto: UpdateUserStateDto,
    adminId?: string,
    correlationId?: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException({
        statusCode: 404,
        errorCode: 'USER_NOT_FOUND',
        message: `User with ID ${id} not found`,
      });
    }

    if (dto.accountState === AccountState.DEPARTED) {
      if (user.role === Role.STUDENT) {
        await this.academicService.handleStudentDeparture(id, adminId, correlationId);
      } else if (user.role === Role.TEACHER) {
        await this.academicService.handleTeacherDeparture(id, adminId, correlationId);
      }
    }

    if (dto.accountState !== AccountState.ACTIVE) {
      await this.redisService.deleteSessionsForUser(id);
    }

    return this.prisma.user.update({
      where: { id },
      data: { accountState: dto.accountState },
      select: {
        id: true,
        nationalId: true,
        firstName: true,
        lastName: true,
        username: true,
        role: true,
        accountState: true,
        updatedAt: true,
      },
    });
  }
}
