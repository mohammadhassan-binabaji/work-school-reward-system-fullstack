import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UpdateTierConfigurationsDto } from './dto/rankings.dto';
import { RankingUtil, RawStudentScore } from '../../common/utils/ranking.util';
import { Role, AccountState } from '@prisma/client';

@Injectable()
export class RankingsService {
  constructor(private prisma: PrismaService) {}

  // Class Rankings (FR-054, FR-056, FR-058, FR-093)
  async getClassRankings(
    classId: string,
    currentUser: { id: string; role: Role },
  ) {
    const cls = await this.prisma.class.findUnique({ where: { id: classId } });
    if (!cls) {
      throw new NotFoundException({
        statusCode: 404,
        errorCode: 'CLASS_NOT_FOUND',
        message: 'Class not found',
      });
    }

    if (currentUser.role === Role.TEACHER) {
      const assignment = await this.prisma.teacherClassSubjectAssignment.findFirst({
        where: { teacherId: currentUser.id, classId, status: 'ACTIVE' },
      });
      if (!assignment) {
        throw new ForbiddenException({
          statusCode: 403,
          errorCode: 'UNAUTHORIZED_CLASS_ACCESS',
          message: 'Teacher is not assigned to this class',
        });
      }
    }

    const students = await this.prisma.studentProfile.findMany({
      where: {
        classId,
        user: { accountState: AccountState.ACTIVE },
      },
      include: {
        user: true,
      },
      orderBy: { currentBalance: 'desc' },
    });

    const rawScores: RawStudentScore[] = students.map((s) => ({
      studentId: s.id,
      nationalId: s.user.nationalId,
      firstName: s.user.firstName,
      lastName: s.user.lastName,
      username: s.user.username,
      points: s.currentBalance,
    }));

    const fullRankings = RankingUtil.computeStandardCompetitionRanking(rawScores);

    if (currentUser.role === Role.STUDENT) {
      return RankingUtil.applyStudentPrivacyMask(fullRankings, currentUser.id, 3);
    }

    return {
      totalActiveStudents: fullRankings.length,
      rankings: fullRankings,
    };
  }

  // School-Wide Rankings (FR-055, FR-056, FR-057, FR-058)
  async getSchoolRankings(currentUser: { id: string; role: Role }) {
    const students = await this.prisma.studentProfile.findMany({
      where: {
        user: { accountState: AccountState.ACTIVE },
      },
      include: {
        user: true,
      },
      orderBy: { currentBalance: 'desc' },
    });

    const rawScores: RawStudentScore[] = students.map((s) => ({
      studentId: s.id,
      nationalId: s.user.nationalId,
      firstName: s.user.firstName,
      lastName: s.user.lastName,
      username: s.user.username,
      points: s.currentBalance,
    }));

    const fullRankings = RankingUtil.computeStandardCompetitionRanking(rawScores);

    if (currentUser.role === Role.STUDENT) {
      return RankingUtil.applyStudentPrivacyMask(fullRankings, currentUser.id, 3);
    }

    return {
      totalActiveStudents: fullRankings.length,
      rankings: fullRankings,
    };
  }

  // Tier Configurations CRUD & Dynamic Evaluation (FR-060, FR-061, FR-092)
  async getTierConfigurations() {
    const tiers = await this.prisma.tierConfiguration.findMany({
      orderBy: { tierNumber: 'asc' },
    });

    if (tiers.length === 0) {
      // Return default 5 tiers if not yet seeded
      const defaults = [
        { tierNumber: 1, name: 'Bronze', minPointsThreshold: 0 },
        { tierNumber: 2, name: 'Silver', minPointsThreshold: 100 },
        { tierNumber: 3, name: 'Gold', minPointsThreshold: 250 },
        { tierNumber: 4, name: 'Platinum', minPointsThreshold: 500 },
        { tierNumber: 5, name: 'Diamond', minPointsThreshold: 1000 },
      ];
      for (const t of defaults) {
        await this.prisma.tierConfiguration.create({ data: t });
      }
      return this.prisma.tierConfiguration.findMany({
        orderBy: { tierNumber: 'asc' },
      });
    }

    return tiers;
  }

  async updateTierConfigurations(dto: UpdateTierConfigurationsDto) {
    if (dto.tiers.length !== 5) {
      throw new BadRequestException('Exactly 5 tier configurations must be provided');
    }

    // Verify numbers 1 to 5 are unique and thresholds non-negative
    const numbers = new Set(dto.tiers.map((t) => t.tierNumber));
    if (numbers.size !== 5 || !numbers.has(1) || !numbers.has(5)) {
      throw new BadRequestException('Tiers must contain unique tierNumbers from 1 to 5');
    }

    return this.prisma.$transaction(async (tx) => {
      for (const tierDto of dto.tiers) {
        await tx.tierConfiguration.upsert({
          where: { tierNumber: tierDto.tierNumber },
          create: {
            tierNumber: tierDto.tierNumber,
            name: tierDto.name,
            minPointsThreshold: tierDto.minPointsThreshold,
          },
          update: {
            name: tierDto.name,
            minPointsThreshold: tierDto.minPointsThreshold,
          },
        });
      }

      // Re-evaluate all active students' tiers
      const allStudents = await tx.studentProfile.findMany();
      const allTiers = await tx.tierConfiguration.findMany({
        orderBy: { minPointsThreshold: 'desc' },
      });

      for (const student of allStudents) {
        const matchingTier = allTiers.find((t) => t.minPointsThreshold <= student.currentBalance);
        if (matchingTier && matchingTier.id !== student.currentTierId) {
          await tx.studentProfile.update({
            where: { id: student.id },
            data: { currentTierId: matchingTier.id },
          });
        }
      }

      return tx.tierConfiguration.findMany({
        orderBy: { tierNumber: 'asc' },
      });
    });
  }

  // Student Balance History (FR-063, FR-078)
  async getStudentBalanceHistory(
    studentId: string,
    currentUser: { id: string; role: Role },
    days = 7,
  ) {
    if (currentUser.role === Role.STUDENT && currentUser.id !== studentId) {
      throw new ForbiddenException({
        statusCode: 403,
        errorCode: 'FORBIDDEN',
        message: 'Cannot view balance history of other students',
      });
    }

    if (currentUser.role === Role.TEACHER) {
      const studentProfile = await this.prisma.studentProfile.findUnique({
        where: { id: studentId },
      });
      if (studentProfile?.classId) {
        const assignment = await this.prisma.teacherClassSubjectAssignment.findFirst({
          where: { teacherId: currentUser.id, classId: studentProfile.classId, status: 'ACTIVE' },
        });
        if (!assignment) {
          throw new ForbiddenException({
            statusCode: 403,
            errorCode: 'FORBIDDEN',
            message: 'Teacher is not assigned to this student class',
          });
        }
      }
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.prisma.dailyStudentBalanceSnapshot.findMany({
      where: {
        studentId,
        snapshotDate: { gte: startDate },
      },
      orderBy: { snapshotDate: 'asc' },
    });
  }
}
