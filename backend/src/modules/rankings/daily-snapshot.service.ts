import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AccountState } from '@prisma/client';

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

    let count = 0;
    for (const student of activeStudents) {
      await this.prisma.dailyStudentBalanceSnapshot.upsert({
        where: {
          studentId_snapshotDate: {
            studentId: student.id,
            snapshotDate,
          },
        },
        create: {
          studentId: student.id,
          balance: student.currentBalance,
          snapshotDate,
        },
        update: {
          balance: student.currentBalance,
        },
      });
      count++;
    }

    this.logger.log(
      `Successfully recorded daily balance snapshots for ${count} active students on ${snapshotDate.toISOString()}`,
    );
    return { snapshotDate, studentCount: count };
  }
}
