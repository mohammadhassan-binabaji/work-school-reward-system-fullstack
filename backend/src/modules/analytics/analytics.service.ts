import { prisma } from '../../core/prisma.js';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError
} from '../../core/errors.js';
import {
  RankingsQueryInput,
  UpdateTiersInput
} from './analytics.schemas.js';

export class AnalyticsService {
  static async getRankings(userRole: string, userId: string, query: RankingsQueryInput) {
    let targetClassId = query.classId;

    if (userRole === 'TEACHER') {
      const assignments = await prisma.teacherClassSubject.findMany({
        where: { teacherId: userId, assignmentState: 'Active' },
        select: { classId: true }
      });
      const assignedClassIds = assignments.map((a) => a.classId);

      if (targetClassId) {
        if (!assignedClassIds.includes(targetClassId)) {
          throw new ForbiddenError('Teacher is not assigned to query rankings for this class');
        }
      }
    }

    // Filter active students only (FR-056)
    const students = await prisma.student.findMany({
      where: {
        accountState: 'Active',
        ...(targetClassId ? { classId: targetClassId } : {})
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        currentPoints: true,
        class: { select: { id: true, name: true } }
      },
      orderBy: [
        { currentPoints: 'desc' },
        { lastName: 'asc' },
        { firstName: 'asc' }
      ]
    });

    // Compute Standard Competition Ranking (1224)
    const rankedStudents: any[] = [];
    for (let i = 0; i < students.length; i++) {
      let rank = i + 1;
      if (i > 0 && students[i].currentPoints === students[i - 1].currentPoints) {
        rank = rankedStudents[i - 1].rank;
      }
      rankedStudents.push({
        id: students[i].id,
        rank,
        name: `${students[i].firstName} ${students[i].lastName}`,
        currentPoints: students[i].currentPoints,
        class: students[i].class
      });
    }

    // If Student: return privacy-safe view with Top-N leaderboard (FR-058)
    if (userRole === 'STUDENT') {
      const self = rankedStudents.find((s) => s.id === userId);
      const topN = query.topN ?? 10;
      const leaderboard = rankedStudents.slice(0, topN).map((s) => ({
        rank: s.rank,
        name: s.name,
        currentPoints: s.currentPoints
      }));

      return {
        scope: query.scope ?? 'school',
        ownRank: self?.rank ?? null,
        ownPoints: self?.currentPoints ?? null,
        totalActiveCount: rankedStudents.length,
        topStudents: leaderboard.map((s) => ({
          rank: s.rank,
          studentName: s.name,
          currentPoints: s.currentPoints
        })),
        studentRank: self?.rank ?? null,
        studentPoints: self?.currentPoints ?? null,
        populationCount: rankedStudents.length,
        summary: self ? `Rank ${self.rank} of ${rankedStudents.length}` : 'Unranked',
        leaderboard
      };
    }

    // Admin & Teacher: return full rankings
    return {
      scope: query.scope ?? 'school',
      classId: targetClassId ?? null,
      totalCount: rankedStudents.length,
      rankings: rankedStudents
    };
  }

  static async getTiers() {
    return prisma.studentTier.findMany({
      orderBy: { tierIndex: 'asc' }
    });
  }

  static async updateTiers(input: UpdateTiersInput) {
    if (!input.tiers || input.tiers.length !== 5) {
      throw new BadRequestError('Must provide exactly 5 student tiers');
    }

    // Upsert 5 tiers
    for (const t of input.tiers) {
      await prisma.studentTier.upsert({
        where: { tierIndex: t.tierIndex },
        update: {
          tierName: t.tierName,
          minPoints: t.minPoints,
          displayColor: t.displayColor
        },
        create: {
          tierIndex: t.tierIndex,
          tierName: t.tierName,
          minPoints: t.minPoints,
          displayColor: t.displayColor
        }
      });
    }

    // Re-evaluate all active students' tier assignments
    const allTiers = await prisma.studentTier.findMany({
      orderBy: { tierIndex: 'desc' }
    });
    const students = await prisma.student.findMany({
      where: { accountState: 'Active' },
      select: { id: true, currentPoints: true }
    });

    for (const s of students) {
      const best = allTiers.find((tier) => s.currentPoints >= tier.minPoints) || allTiers[allTiers.length - 1];
      if (best) {
        await prisma.student.update({
          where: { id: s.id },
          data: { currentTierId: best.id }
        });
      }
    }

    return prisma.studentTier.findMany({ orderBy: { tierIndex: 'asc' } });
  }

  static async triggerSnapshots(snapshotDate?: string) {
    const dateStr = snapshotDate || new Date().toISOString().split('T')[0];

    const activeStudents = await prisma.student.findMany({
      where: { accountState: 'Active' },
      select: { id: true, currentPoints: true }
    });

    let count = 0;
    for (const student of activeStudents) {
      await prisma.dailyStudentBalanceSnapshot.upsert({
        where: {
          studentId_snapshotDate: {
            studentId: student.id,
            snapshotDate: dateStr
          }
        },
        update: {
          endOfDayBalance: student.currentPoints
        },
        create: {
          studentId: student.id,
          snapshotDate: dateStr,
          endOfDayBalance: student.currentPoints
        }
      });
      count++;
    }

    return {
      message: 'Daily balance snapshots recorded successfully',
      snapshotDate: dateStr,
      capturedCount: count
    };
  }

  static async getStudentHistory(studentId: string, role: string, currentUserId: string) {
    if (role === 'STUDENT' && studentId !== currentUserId) {
      throw new ForbiddenError('Students can only view their own balance history');
    }

    if (role === 'TEACHER') {
      const student = await prisma.student.findUnique({ where: { id: studentId } });
      if (!student || !student.classId) {
        throw new NotFoundError('Student not found');
      }
      const assignment = await prisma.teacherClassSubject.findFirst({
        where: {
          teacherId: currentUserId,
          classId: student.classId,
          assignmentState: 'Active'
        }
      });
      if (!assignment) {
        throw new ForbiddenError('Teacher is not assigned to this student\'s class');
      }
    }

    return prisma.dailyStudentBalanceSnapshot.findMany({
      where: { studentId },
      orderBy: { snapshotDate: 'desc' }
    });
  }
}
