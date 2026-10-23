import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AccountState } from '@prisma/client';
import { RankingUtil, RawStudentScore } from '../../common/utils/ranking.util';

@Injectable()
export class DailySnapshotService {
  private readonly logger = new Logger(DailySnapshotService.name);

  constructor(private prisma: PrismaService) {}

  @Cron('0 0 0 * * *')
  async handleDailyMidnightSnapshot() {
    this.logger.log('Executing automated midnight daily student balance snapshot cron job');
    await this.takeDailySnapshot();
  }

  async takeDailySnapshot(targetDate?: Date) {
    const today = targetDate || new Date();
    // Normalize to date-only without time (UTC midnight)
    const snapshotDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));

    const activeStudents = await this.prisma.studentProfile.findMany({
      where: {
        user: { accountState: AccountState.ACTIVE },
      },
    });

    // ── Compute school-wide ranks ──────────────────────────────────────────
    const schoolScores: RawStudentScore[] = activeStudents
      .slice()
      .sort((a, b) => b.currentBalance - a.currentBalance)
      .map((s) => ({
        studentId: s.id,
        nationalId: '',
        firstName: '',
        lastName: '',
        username: '',
        points: s.currentBalance,
      }));

    const schoolRanked = RankingUtil.computeStandardCompetitionRanking(schoolScores);
    // Build quick lookup: studentId → schoolRank
    const schoolRankMap = new Map<string, number>(schoolRanked.map((r) => [r.studentId, r.rank]));

    // ── Compute class ranks ────────────────────────────────────────────────
    // Group students by classId (students without a class are skipped)
    const classGroups = new Map<string, typeof activeStudents>();
    for (const student of activeStudents) {
      if (!student.classId) continue;
      if (!classGroups.has(student.classId)) classGroups.set(student.classId, []);
      classGroups.get(student.classId)!.push(student);
    }

    // Build quick lookup: studentId → classRank (null if no class)
    const classRankMap = new Map<string, number | null>();
    for (const student of activeStudents) {
      classRankMap.set(student.id, null); // default null
    }
    for (const [, members] of classGroups) {
      const classScores: RawStudentScore[] = members
        .slice()
        .sort((a, b) => b.currentBalance - a.currentBalance)
        .map((s) => ({
          studentId: s.id,
          nationalId: '',
          firstName: '',
          lastName: '',
          username: '',
          points: s.currentBalance,
        }));
      const classRanked = RankingUtil.computeStandardCompetitionRanking(classScores);
      for (const r of classRanked) {
        classRankMap.set(r.studentId, r.rank);
      }
    }

    // ── Upsert snapshots ──────────────────────────────────────────────────
    let count = 0;
    for (const student of activeStudents) {
      const schoolRank = schoolRankMap.get(student.id) ?? 1;
      const classRank = classRankMap.get(student.id) ?? null;

      await this.prisma.dailyStudentSnapshot.upsert({
        where: {
          studentId_snapshotDate: {
            studentId: student.id,
            snapshotDate,
          },
        },
        create: {
          studentId: student.id,
          balance: student.currentBalance,
          schoolRank,
          classRank,
          snapshotDate,
        },
        update: {
          balance: student.currentBalance,
          schoolRank,
          classRank,
        },
      });
      count++;
    }

    this.logger.log(
      `Successfully recorded daily snapshots (balance + school/class ranks) for ${count} active students on ${snapshotDate.toISOString()}`,
    );
    return { snapshotDate, studentCount: count };
  }
}
