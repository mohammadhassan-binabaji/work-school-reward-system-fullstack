import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { prisma } from '../../src/core/prisma.js';
import { closeRedis } from '../../src/core/redis.js';
import { cleanDatabase } from '../test-helpers.js';

describe('Activities, Verifications & Abuse Ban Integration Tests (US5)', () => {
  let app: FastifyInstance;
  let adminSessionId: string;
  let studentId: string;
  let studentSessionId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Clean up
    await cleanDatabase();

    // Provision admin
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/provision-admin',
      payload: {
        nationalId: '1000000001',
        username: 'admin5',
        password: 'Password123!',
        firstName: 'Admin',
        lastName: 'Five'
      }
    });
    const adminLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { nationalId: '1000000001', password: 'Password123!' }
    });
    adminSessionId = JSON.parse(adminLogin.payload).sessionId;

    // Create student
    const sRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/users',
      headers: { authorization: `Bearer ${adminSessionId}` },
      payload: {
        nationalId: '3000000001',
        username: 'studentActivity',
        password: 'Password123!',
        firstName: 'Active',
        lastName: 'Student',
        role: 'STUDENT'
      }
    });
    studentId = JSON.parse(sRes.payload).id;

    const sLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { nationalId: '3000000001', password: 'Password123!' }
    });
    studentSessionId = JSON.parse(sLogin.payload).sessionId;
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
    await closeRedis();
  });

  let activityId: string;

  it('admin creates challenge with fixed immutable point value', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/activities',
      headers: { authorization: `Bearer ${adminSessionId}` },
      payload: {
        type: 'Challenge',
        name: 'Math Olympiad Prep',
        description: 'Solve 10 advanced equations',
        pointValue: 25,
        completionLimit: 5
      }
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    activityId = body.id;
    expect(body.pointValue).toBe(25);
  });

  let verification1Id: string;

  it('student submits verification and admin accepts (awarding points and audit)', async () => {
    const subRes = await app.inject({
      method: 'POST',
      url: `/api/v1/activities/${activityId}/verifications`,
      headers: { authorization: `Bearer ${studentSessionId}` },
      payload: {
        evidenceDescription: 'Completed all 10 equations with detailed proofs'
      }
    });
    expect(subRes.statusCode).toBe(201);
    verification1Id = JSON.parse(subRes.payload).id;

    const reviewRes = await app.inject({
      method: 'POST',
      url: `/api/v1/activities/verifications/${verification1Id}/review`,
      headers: { authorization: `Bearer ${adminSessionId}` },
      payload: {
        decision: 'Accepted',
        reviewNotes: 'Great work on all equations!'
      }
    });
    expect(reviewRes.statusCode).toBe(200);

    const student = await prisma.student.findUnique({ where: { id: studentId } });
    expect(student?.currentPoints).toBe(25);
    expect(student?.highestBalance).toBe(25);

    const audit = await prisma.auditRecord.findFirst({
      where: { actionType: 'CHALLENGE_AWARD', recipientId: studentId }
    });
    expect(audit).toBeDefined();
    expect(audit?.pointAmount).toBe(25);
  });

  it('3 rejections trigger automated 30-day abuse ban', async () => {
    // Rejection 1
    const sub1 = await app.inject({
      method: 'POST',
      url: `/api/v1/activities/${activityId}/verifications`,
      headers: { authorization: `Bearer ${studentSessionId}` },
      payload: { evidenceDescription: 'Incomplete proof 1' }
    });
    const v1Id = JSON.parse(sub1.payload).id;
    await app.inject({
      method: 'POST',
      url: `/api/v1/activities/verifications/${v1Id}/review`,
      headers: { authorization: `Bearer ${adminSessionId}` },
      payload: { decision: 'Rejected', reviewNotes: 'Missing steps' }
    });

    // Rejection 2
    const sub2 = await app.inject({
      method: 'POST',
      url: `/api/v1/activities/${activityId}/verifications`,
      headers: { authorization: `Bearer ${studentSessionId}` },
      payload: { evidenceDescription: 'Incomplete proof 2' }
    });
    const v2Id = JSON.parse(sub2.payload).id;
    await app.inject({
      method: 'POST',
      url: `/api/v1/activities/verifications/${v2Id}/review`,
      headers: { authorization: `Bearer ${adminSessionId}` },
      payload: { decision: 'Rejected', reviewNotes: 'Still incorrect' }
    });

    // Rejection 3 - triggers ban
    const sub3 = await app.inject({
      method: 'POST',
      url: `/api/v1/activities/${activityId}/verifications`,
      headers: { authorization: `Bearer ${studentSessionId}` },
      payload: { evidenceDescription: 'Spam submission' }
    });
    const v3Id = JSON.parse(sub3.payload).id;
    const rev3 = await app.inject({
      method: 'POST',
      url: `/api/v1/activities/verifications/${v3Id}/review`,
      headers: { authorization: `Bearer ${adminSessionId}` },
      payload: { decision: 'Rejected', reviewNotes: 'Third rejection: automatic ban applied' }
    });
    expect(rev3.statusCode).toBe(200);

    // Verify ban in DB
    const ban = await prisma.studentActivityBan.findFirst({
      where: { studentId, activityId }
    });
    expect(ban).toBeDefined();
    expect(ban?.unbannedAt).toBeNull();
    expect(new Date(ban!.bannedUntil).getTime()).toBeGreaterThan(Date.now());
  });

  it('student submission is blocked with 403 Forbidden while ban is active', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/activities/${activityId}/verifications`,
      headers: { authorization: `Bearer ${studentSessionId}` },
      payload: { evidenceDescription: 'Attempting to submit while banned' }
    });
    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.payload);
    expect(body.message).toContain('banned');
  });

  it('admin clears ban with unban override, restoring submission eligibility', async () => {
    const unbanRes = await app.inject({
      method: 'POST',
      url: `/api/v1/activities/bans/${studentId}/${activityId}/unban`,
      headers: { authorization: `Bearer ${adminSessionId}` }
    });
    expect(unbanRes.statusCode).toBe(200);

    const ban = await prisma.studentActivityBan.findFirst({
      where: { studentId, activityId }
    });
    expect(ban?.unbannedAt).not.toBeNull();

    // Student can submit again
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/activities/${activityId}/verifications`,
      headers: { authorization: `Bearer ${studentSessionId}` },
      payload: { evidenceDescription: 'Legitimate revised submission post-unban' }
    });
    expect(res.statusCode).toBe(201);
  });
});
