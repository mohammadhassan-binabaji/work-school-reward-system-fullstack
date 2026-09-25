import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { RankingUtil, RawStudentScore } from '../../src/common/utils/ranking.util';

describe('Rankings & Tiers Integration Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('correctly calculates standard competition ranking (1, 2, 2, 4)', () => {
    const rawScores: RawStudentScore[] = [
      {
        studentId: '1',
        nationalId: '1111111111',
        firstName: 'Alice',
        lastName: 'A',
        username: 'alice',
        points: 100,
      },
      {
        studentId: '2',
        nationalId: '2222222222',
        firstName: 'Bob',
        lastName: 'B',
        username: 'bob',
        points: 80,
      },
      {
        studentId: '3',
        nationalId: '3333333333',
        firstName: 'Charlie',
        lastName: 'C',
        username: 'charlie',
        points: 80,
      },
      {
        studentId: '4',
        nationalId: '4444444444',
        firstName: 'David',
        lastName: 'D',
        username: 'david',
        points: 50,
      },
    ];

    const ranked = RankingUtil.computeStandardCompetitionRanking(rawScores);

    expect(ranked[0].rank).toBe(1);
    expect(ranked[1].rank).toBe(2);
    expect(ranked[2].rank).toBe(2);
    expect(ranked[3].rank).toBe(4); // Standard competition ranking skips to 4!
  });

  it('masks student ranking to protect privacy of non-top peers', () => {
    const rawScores: RawStudentScore[] = [
      {
        studentId: '1',
        nationalId: '1111111111',
        firstName: 'Alice',
        lastName: 'A',
        username: 'alice',
        points: 100,
      },
      {
        studentId: '2',
        nationalId: '2222222222',
        firstName: 'Bob',
        lastName: 'B',
        username: 'bob',
        points: 80,
      },
      {
        studentId: '3',
        nationalId: '3333333333',
        firstName: 'Charlie',
        lastName: 'C',
        username: 'charlie',
        points: 80,
      },
      {
        studentId: '4',
        nationalId: '4444444444',
        firstName: 'David',
        lastName: 'D',
        username: 'david',
        points: 50,
      },
      {
        studentId: '5',
        nationalId: '5555555555',
        firstName: 'Eva',
        lastName: 'E',
        username: 'eva',
        points: 40,
      },
    ];

    const ranked = RankingUtil.computeStandardCompetitionRanking(rawScores);
    const masked = RankingUtil.applyStudentPrivacyMask(ranked, '4', 3);

    expect(masked.totalActiveStudents).toBe(5);
    expect(masked.selfRank?.rank).toBe(4);
    expect(masked.selfRank?.points).toBe(50);
    expect(masked.topStudents.length).toBe(3); // Only top 3 students shown
    expect(masked.topStudents.some((s) => s.studentName.includes('Eva'))).toBe(false);
  });
});
