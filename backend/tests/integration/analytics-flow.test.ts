import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { prisma } from '../../src/core/prisma.js';
import { closeRedis } from '../../src/core/redis.js';
import { cleanDatabase } from '../test-helpers.js';

describe('Analytics, Rankings, Tiers & Snapshots Integration Tests (US7)', () => {
  let app: FastifyInstance;
  let adminSessionId: string;
  let studentDSessionId: string;
  let studentDId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    await cleanDatabase();

    // Recreate default tiers
    const defaultTiers = [
      { tierIndex: 1, tierName: 'Bronze', minPoints: 0, displayColor: '#CD7F32' },
      { tierIndex: 2, tierName: 'Silver', minPoints: 100, displayColor: '#C0C0C0' },
      { tierIndex: 3, tierName: 'Gold', minPoints: 300, displayColor: '#FFD700' },
      { tierIndex: 4, tierName: 'Platinum', minPoints: 600, displayColor: '#E5E4E2' },
      { tierIndex: 5, tierName: 'Diamond', minPoints: 1000, displayColor: '#B9F2FF' }
    ];
    for (const t of defaultTiers) {
      await prisma.studentTier.upsert({
        where: { tierIndex: t.tierIndex },
        update: {},
        create: t
      });
    }

    // Provision admin
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/provision-admin',
      payload: {
        nationalId: '1000000001',
        username: 'admin7',
        password: 'Password123!',
        firstName: 'Admin',
        lastName: 'Seven'
      }
    });
    const adminLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { nationalId: '1000000001', password: 'Password123!' }
    });
    adminSessionId = JSON.parse(adminLogin.payload).sessionId;

    // Create Class
    const cRes = await app.inject({
      method: 'POST',
      url: '/api/v1/academic/classes',
      headers: { authorization: `Bearer ${adminSessionId}` },
      payload: { name: 'Class 9A' }
    });
    const classId = JSON.parse(cRes.payload).id;

    // Create students:
    // Student A: 100 pts
    await prisma.student.create({
      data: {
        nationalId: '3000000001',
        username: 'studentA',
        passwordHash: 'hash',
        firstName: 'Alice',
        lastName: 'Anderson',
        currentPoints: 100,
        accountState: 'Active',
        classId
      }
    });

    // Student B: 80 pts
    await prisma.student.create({
      data: {
        nationalId: '3000000002',
        username: 'studentB',
        passwordHash: 'hash',
        firstName: 'Bob',
        lastName: 'Brown',
        currentPoints: 80,
        accountState: 'Active',
        classId
      }
    });

    // Student C: 80 pts
    await prisma.student.create({
      data: {
        nationalId: '3000000003',
        username: 'studentC',
        passwordHash: 'hash',
        firstName: 'Charlie',
        lastName: 'Clark',
        currentPoints: 80,
        accountState: 'Active',
        classId
      }
    });

    // Student D: 50 pts
    const sD = await prisma.student.create({
      data: {
        nationalId: '3000000004',
        username: 'studentD',
        passwordHash: 'hash',
        firstName: 'David',
        lastName: 'Davis',
        currentPoints: 50,
        accountState: 'Active',
        classId
      }
    });
    studentDId = sD.id;

    // Student E (Inactive): 90 pts
    await prisma.student.create({
      data: {
        nationalId: '3000000005',
        username: 'studentE',
        passwordHash: 'hash',
        firstName: 'Eve',
        lastName: 'Evans',
        currentPoints: 90,
        accountState: 'Inactive',
        classId
      }
    });

    // Login student D
    const sDLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { nationalId: '3000000004', password: 'hash' }
    });
    // In our test, we didn't hash 'hash' with argon2, so let's set real password
    const { hash } = await import('@node-rs/argon2');
    await prisma.student.update({
      where: { id: studentDId },
      data: { passwordHash: await hash('Password123!') }
    });
    const sDRealLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { nationalId: '3000000004', password: 'Password123!' }
    });
    studentDSessionId = JSON.parse(sDRealLogin.payload).sessionId;
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
    await closeRedis();
  });

  it('admin queries rankings with standard competition ranking 1224 and inactive exclusion', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/analytics/rankings',
      headers: { authorization: `Bearer ${adminSessionId}` }
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.rankings.length).toBe(4); // Inactive Eve is excluded

    // Scores 100, 80, 80, 50 -> Ranks 1, 2, 2, 4
    const ranks = body.rankings.map((r: any) => r.rank);
    expect(ranks).toEqual([1, 2, 2, 4]);
  });

  it('student queries rankings and receives privacy-safe view with Top-N leaderboard', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/analytics/rankings?topN=2',
      headers: { authorization: `Bearer ${studentDSessionId}` }
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);

    expect(body.studentRank).toBe(4);
    expect(body.studentPoints).toBe(50);
    expect(body.populationCount).toBe(4);
    expect(body.summary).toBe('Rank 4 of 4');

    // Top 2 leaderboard
    expect(body.leaderboard.length).toBe(2);
    expect(body.leaderboard[0].rank).toBe(1);
    expect(body.leaderboard[1].rank).toBe(2);
  });

  it('admin updates 5-tier configurations', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/analytics/tiers',
      headers: { authorization: `Bearer ${adminSessionId}` },
      payload: {
        tiers: [
          { tierIndex: 1, tierName: 'Beginner', minPoints: 0, displayColor: '#A0522D' },
          { tierIndex: 2, tierName: 'Intermediate', minPoints: 50, displayColor: '#C0C0C0' },
          { tierIndex: 3, tierName: 'Advanced', minPoints: 150, displayColor: '#FFD700' },
          { tierIndex: 4, tierName: 'Expert', minPoints: 300, displayColor: '#E5E4E2' },
          { tierIndex: 5, tierName: 'Master', minPoints: 500, displayColor: '#B9F2FF' }
        ]
      }
    });
    expect(res.statusCode).toBe(200);

    const updatedTiers = await prisma.studentTier.findMany({ orderBy: { tierIndex: 'asc' } });
    expect(updatedTiers[0].tierName).toBe('Beginner');
    expect(updatedTiers[1].minPoints).toBe(50);
  });

  it('triggers daily balance snapshot and queries student balance history', async () => {
    const today = new Date().toISOString().split('T')[0];

    const triggerRes = await app.inject({
      method: 'POST',
      url: '/api/v1/analytics/snapshots/trigger',
      headers: { authorization: `Bearer ${adminSessionId}` },
      payload: { snapshotDate: today }
    });
    expect(triggerRes.statusCode).toBe(200);

    const historyRes = await app.inject({
      method: 'GET',
      url: `/api/v1/analytics/students/${studentDId}/history`,
      headers: { authorization: `Bearer ${studentDSessionId}` }
    });
    expect(historyRes.statusCode).toBe(200);
    const history = JSON.parse(historyRes.payload);
    expect(history.length).toBeGreaterThan(0);
    expect(history[0].endOfDayBalance).toBe(50);
    expect(history[0].snapshotDate).toBe(today);
  });
});
