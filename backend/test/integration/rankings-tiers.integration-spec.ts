import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestingApp } from '../helpers/test-app.helper';
import { cleanDatabase, cleanRedis, seedBaselineTiers, seedSystemPool } from '../helpers/test-db.helper';
import { loginUser } from '../helpers/auth.helper';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { RedisService } from '../../src/common/redis/redis.service';
import { RankingUtil, RawStudentScore } from '../../src/common/utils/ranking.util';

describe('Rankings & Tiers Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: RedisService;
  let adminCookie: string;

  beforeAll(async () => {
    app = await createTestingApp();
    prisma = app.get(PrismaService);
    redis = app.get(RedisService);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
    await cleanRedis(redis);
    await seedBaselineTiers(prisma);
    await seedSystemPool(prisma);

    await request(app.getHttpServer())
      .post('/api/v1/auth/initial-admin')
      .send({
        nationalId: '1111111111',
        firstName: 'Admin',
        lastName: 'Super',
        username: 'admin',
        password: 'AdminPassword123!',
      })
      .expect(201);

    const adminAuth = await loginUser(app, '1111111111', 'AdminPassword123!');
    adminCookie = adminAuth.cookie;
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
    ];

    const ranked = RankingUtil.computeStandardCompetitionRanking(rawScores);
    const masked = RankingUtil.applyStudentPrivacyMask(ranked, '4', 3);

    expect(masked.selfRank).toBeDefined();
    expect(masked.selfRank?.rank).toBe(4);
    expect(masked.topStudents.length).toBe(3);
    // Peer details beyond top 3 should not be in the list
    expect(masked.topStudents.some((s) => s.studentName.includes('David'))).toBe(false);
  });

  it('excludes departed or inactive students from active rankings (FR-056)', async () => {
    const classRes = await request(app.getHttpServer())
      .post('/api/v1/classes')
      .set('Cookie', adminCookie)
      .send({ name: 'Class 7A' })
      .expect(201);
    const classId = classRes.body.id;

    // Student 1 (Active, 100 pts)
    const s1 = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Cookie', adminCookie)
      .send({
        nationalId: '3000000001',
        firstName: 'Active',
        lastName: 'One',
        username: 'active1',
        password: 'Password123!',
        role: 'STUDENT',
        classId,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/points/admin-adjust')
      .set('Cookie', adminCookie)
      .send({ studentId: s1.body.id, amount: 100, reason: 'Test' })
      .expect(200);

    // Student 2 (Departed, 200 pts)
    const s2 = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Cookie', adminCookie)
      .send({
        nationalId: '3000000002',
        firstName: 'Departed',
        lastName: 'Two',
        username: 'departed2',
        password: 'Password123!',
        role: 'STUDENT',
        classId,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/classes/students/${s2.body.id}/depart`)
      .set('Cookie', adminCookie)
      .expect(201);

    // Query Class Rankings as Admin
    const rankRes = await request(app.getHttpServer())
      .get(`/api/v1/rankings/class/${classId}`)
      .set('Cookie', adminCookie)
      .expect(200);

    expect(rankRes.body.totalActiveStudents).toBe(1);
    expect(rankRes.body.rankings[0].studentId).toBe(s1.body.id);
  });

  it('manages 5-tier configuration updates and auto-tier recalculation (FR-060, FR-061)', async () => {
    // Admin updates tiers
    const updatedTiers = [
      { tierNumber: 1, name: 'Novice', minPointsThreshold: 0 },
      { tierNumber: 2, name: 'Apprentice', minPointsThreshold: 50 },
      { tierNumber: 3, name: 'Adept', minPointsThreshold: 150 },
      { tierNumber: 4, name: 'Master', minPointsThreshold: 300 },
      { tierNumber: 5, name: 'Grandmaster', minPointsThreshold: 600 },
    ];

    await request(app.getHttpServer())
      .put('/api/v1/tiers')
      .set('Cookie', adminCookie)
      .send({ tiers: updatedTiers })
      .expect(200);

    // Create student
    const student = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Cookie', adminCookie)
      .send({
        nationalId: '3333333333',
        firstName: 'Alice',
        lastName: 'Student',
        username: 'alice',
        password: 'Password123!',
        role: 'STUDENT',
      })
      .expect(201);
    const studentId = student.body.id;

    // Initially at Tier 1 (Novice)
    let profile = await prisma.studentProfile.findUnique({
      where: { id: studentId },
      include: { currentTier: true },
    });
    expect(profile?.currentTier?.name).toBe('Novice');

    // Grant 150 points -> Should automatically become Adept (Tier 3)
    await request(app.getHttpServer())
      .post('/api/v1/points/admin-adjust')
      .set('Cookie', adminCookie)
      .send({ studentId, amount: 150, reason: 'Tier upgrade' })
      .expect(200);

    profile = await prisma.studentProfile.findUnique({
      where: { id: studentId },
      include: { currentTier: true },
    });
    expect(profile?.currentTier?.name).toBe('Adept');

    // Verify updating tiers with themeId and motivationalMessages
    const themedTiers = [
      {
        tierNumber: 1,
        name: 'برنز',
        minPointsThreshold: 0,
        themeId: 'bronze_ember',
        motivationalMessages: ['پیام برنز'],
      },
      {
        tierNumber: 2,
        name: 'نقره‌ای',
        minPointsThreshold: 50,
        themeId: 'silver_cyber',
        motivationalMessages: ['پیام نقره‌ای'],
      },
      {
        tierNumber: 3,
        name: 'طلایی',
        minPointsThreshold: 150,
        themeId: 'gold_aurelian',
        motivationalMessages: ['پیام طلایی'],
      },
      {
        tierNumber: 4,
        name: 'پلاتین',
        minPointsThreshold: 300,
        themeId: 'platinum_bioglaze',
        motivationalMessages: ['پیام پلاتین'],
      },
      {
        tierNumber: 5,
        name: 'الماس',
        minPointsThreshold: 600,
        themeId: 'diamond_aether',
        motivationalMessages: ['پیام الماس'],
      },
    ];

    const putRes = await request(app.getHttpServer())
      .put('/api/v1/tiers')
      .set('Cookie', adminCookie)
      .send({ tiers: themedTiers })
      .expect(200);

    expect(putRes.body[0].themeId).toBe('bronze_ember');
    expect(putRes.body[0].motivationalMessages).toEqual(['پیام برنز']);
    expect(putRes.body[4].themeId).toBe('diamond_aether');
    expect(putRes.body[4].motivationalMessages).toEqual(['پیام الماس']);

    const getRes = await request(app.getHttpServer())
      .get('/api/v1/tiers')
      .set('Cookie', adminCookie)
      .expect(200);

    expect(getRes.body[2].themeId).toBe('gold_aurelian');
    expect(getRes.body[2].motivationalMessages).toEqual(['پیام طلایی']);
  });

  it('triggers midnight snapshot and queries snapshot history with ranks (FR-062)', async () => {
    const student = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Cookie', adminCookie)
      .send({
        nationalId: '3333333333',
        firstName: 'Alice',
        lastName: 'Student',
        username: 'alice',
        password: 'Password123!',
        role: 'STUDENT',
      })
      .expect(201);
    const studentId = student.body.id;

    await request(app.getHttpServer())
      .post('/api/v1/points/admin-adjust')
      .set('Cookie', adminCookie)
      .send({ studentId, amount: 75, reason: 'Snapshot points' })
      .expect(200);

    // Admin triggers snapshot
    const triggerRes = await request(app.getHttpServer())
      .post('/api/v1/rankings/snapshots/trigger')
      .set('Cookie', adminCookie)
      .expect(200);

    expect(triggerRes.body.studentCount).toBeGreaterThanOrEqual(1);

    // Query snapshot history
    const histRes = await request(app.getHttpServer())
      .get(`/api/v1/rankings/students/${studentId}/snapshot-history`)
      .set('Cookie', adminCookie)
      .expect(200);

    expect(histRes.body.length).toBeGreaterThanOrEqual(1);
    const snapshot = histRes.body[0];
    expect(snapshot.balance).toBe(75);
    // schoolRank is a positive integer (>= 1)
    expect(snapshot.schoolRank).toBeGreaterThanOrEqual(1);
    // classRank is null for a student with no class, or a positive integer if assigned
    expect(snapshot.classRank === null || snapshot.classRank >= 1).toBe(true);
  });
});

