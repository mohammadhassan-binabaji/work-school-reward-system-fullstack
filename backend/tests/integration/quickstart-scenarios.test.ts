import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { prisma } from '../../src/core/prisma.js';
import { closeRedis } from '../../src/core/redis.js';
import { cleanDatabase } from '../test-helpers.js';

describe('Quickstart Scenarios E2E Validation (T063)', () => {
  let app: FastifyInstance;

  // Variables shared across scenarios
  let adminSession: string;
  let classId: string;
  let subjectId: string;
  let teacherId: string;
  let teacherSession: string;
  let studentId: string;
  let studentSession: string;
  let taskId: string;
  let rewardId: string;
  let requestId: string;
  let activityId: string;
  let proposalId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    await cleanDatabase();

    // Ensure system point pool is funded
    await prisma.systemPointPool.upsert({
      where: { id: 'singleton' },
      update: { availableBalance: 10000, totalAllocated: 10000 },
      create: { id: 'singleton', availableBalance: 10000, totalAllocated: 10000 }
    });

    // Ensure 5 default tiers exist
    const tierCount = await prisma.studentTier.count();
    if (tierCount < 5) {
      const defaultTiers = [
        { tierIndex: 1, tierName: 'Bronze', minPoints: 0, displayColor: '#cd7f32' },
        { tierIndex: 2, tierName: 'Silver', minPoints: 100, displayColor: '#c0c0c0' },
        { tierIndex: 3, tierName: 'Gold', minPoints: 300, displayColor: '#ffd700' },
        { tierIndex: 4, tierName: 'Platinum', minPoints: 600, displayColor: '#e5e4e2' },
        { tierIndex: 5, tierName: 'Diamond', minPoints: 1000, displayColor: '#b9f2ff' }
      ];
      for (const t of defaultTiers) {
        await prisma.studentTier.upsert({
          where: { tierIndex: t.tierIndex },
          update: t,
          create: t
        });
      }
    }
  });

  afterAll(async () => {
    await cleanDatabase();
    await app.close();
    await closeRedis();
  });

  // Scenario 1: Initial Admin Provisioning & Session Authentication
  it('Scenario 1: Initial Admin Provisioning & Session Authentication', async () => {
    const provRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/provision-admin',
      payload: {
        nationalId: '1234567890',
        username: 'superadmin',
        password: 'Password123!',
        firstName: 'Super',
        lastName: 'Admin'
      }
    });
    expect(provRes.statusCode).toBe(201);
    const provBody = JSON.parse(provRes.payload);
    expect(provBody.username).toBe('superadmin');
    expect(provBody.passwordHash).toBeUndefined();

    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        nationalId: '1234567890',
        password: 'Password123!'
      }
    });
    expect(loginRes.statusCode).toBe(200);
    const loginBody = JSON.parse(loginRes.payload);
    expect(loginBody.sessionId).toBeDefined();
    adminSession = loginBody.sessionId;
  });

  // Scenario 2: Academic Setup & Class Assignment
  it('Scenario 2: Academic Setup & Class Assignment', async () => {
    // 1. Create Class 7A
    const classRes = await app.inject({
      method: 'POST',
      url: '/api/v1/academic/classes',
      headers: { authorization: `Bearer ${adminSession}` },
      payload: { name: '7A', gradeLevel: 'Grade 7', description: 'Section 7A' }
    });
    expect(classRes.statusCode).toBe(201);
    classId = JSON.parse(classRes.payload).id;

    // 2. Create Subject Math
    const subRes = await app.inject({
      method: 'POST',
      url: '/api/v1/academic/subjects',
      headers: { authorization: `Bearer ${adminSession}` },
      payload: { name: 'Mathematics', description: 'Core Math' }
    });
    expect(subRes.statusCode).toBe(201);
    subjectId = JSON.parse(subRes.payload).id;

    // 3. Provision Teacher and Student
    const tRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/users',
      headers: { authorization: `Bearer ${adminSession}` },
      payload: {
        role: 'TEACHER',
        nationalId: '2345678901',
        username: 'teacher_smith',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Smith'
      }
    });
    expect(tRes.statusCode).toBe(201);
    teacherId = JSON.parse(tRes.payload).id;

    const sRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/users',
      headers: { authorization: `Bearer ${adminSession}` },
      payload: {
        role: 'STUDENT',
        nationalId: '3456789012',
        username: 'student_alice',
        password: 'Password123!',
        firstName: 'Alice',
        lastName: 'Wonder',
        classId
      }
    });
    expect(sRes.statusCode).toBe(201);
    studentId = JSON.parse(sRes.payload).id;

    // 4. Assign Teacher to Class 7A for Math
    const assignRes = await app.inject({
      method: 'POST',
      url: '/api/v1/academic/assignments',
      headers: { authorization: `Bearer ${adminSession}` },
      payload: { teacherId, classId, subjectId }
    });
    expect(assignRes.statusCode).toBe(201);

    // 5. Invalidation on Teacher Deactivation
    const tLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { nationalId: '2345678901', password: 'Password123!' }
    });
    const tempTeacherSession = JSON.parse(tLogin.payload).sessionId;

    await app.inject({
      method: 'PUT',
      url: `/api/v1/academic/teachers/${teacherId}/status`,
      headers: { authorization: `Bearer ${adminSession}` },
      payload: { status: 'Deactivated' }
    });

    const testDeactivated = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { authorization: `Bearer ${tempTeacherSession}` }
    });
    expect(testDeactivated.statusCode).toBe(401);

    // Re-activate teacher
    await app.inject({
      method: 'PUT',
      url: `/api/v1/academic/teachers/${teacherId}/status`,
      headers: { authorization: `Bearer ${adminSession}` },
      payload: { status: 'Active' }
    });
  });

  // Scenario 3: Point Pool Funding & Teacher Award Workflow
  it('Scenario 3: Point Pool Funding & Teacher Award Workflow', async () => {
    // 1. Admin transfers 100 points to Teacher
    const poolRes = await app.inject({
      method: 'POST',
      url: '/api/v1/points/pool/transfer',
      headers: { authorization: `Bearer ${adminSession}` },
      payload: { teacherId, pointAmount: 100 }
    });
    expect(poolRes.statusCode).toBe(200);

    // 2. Admin creates transfer task
    const taskRes = await app.inject({
      method: 'POST',
      url: '/api/v1/points/tasks',
      headers: { authorization: `Bearer ${adminSession}` },
      payload: {
        name: 'Doing Homework',
        description: 'On-time submission',
        options: [5, 10, 15]
      }
    });
    expect(taskRes.statusCode).toBe(201);
    taskId = JSON.parse(taskRes.payload).id;

    // 3. Teacher logs in
    const tLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { nationalId: '2345678901', password: 'Password123!' }
    });
    teacherSession = JSON.parse(tLogin.payload).sessionId;

    // 4. Teacher awards 10 points to Alice
    const awardRes = await app.inject({
      method: 'POST',
      url: '/api/v1/points/award',
      headers: { authorization: `Bearer ${teacherSession}` },
      payload: { studentId, taskId, pointOption: 10 }
    });
    expect(awardRes.statusCode).toBe(200);
    const awardBody = JSON.parse(awardRes.payload);
    expect(awardBody.teacherRemainingBalance).toBe(90);
    expect(awardBody.student.currentPoints).toBe(10);
    expect(awardBody.student.highestBalance).toBe(10);
  });

  // Scenario 4: Reward Redemption Lifecycle
  it('Scenario 4: Reward Redemption Lifecycle', async () => {
    // 1. Admin creates Reward
    const rewRes = await app.inject({
      method: 'POST',
      url: '/api/v1/rewards',
      headers: { authorization: `Bearer ${adminSession}` },
      payload: {
        name: 'School Pen Set',
        description: 'Premium pen set',
        pointPrice: 10,
        requiresApproval: false,
        inventory: 5
      }
    });
    expect(rewRes.statusCode).toBe(201);
    rewardId = JSON.parse(rewRes.payload).id;

    // 2. Student logs in & requests reward
    const sLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { nationalId: '3456789012', password: 'Password123!' }
    });
    studentSession = JSON.parse(sLogin.payload).sessionId;

    const reqRes = await app.inject({
      method: 'POST',
      url: '/api/v1/rewards/requests',
      headers: { authorization: `Bearer ${studentSession}` },
      payload: { rewardId }
    });
    expect(reqRes.statusCode).toBe(201);
    const reqBody = JSON.parse(reqRes.payload);
    expect(reqBody.status).toBe('Pending to Receive');
    requestId = reqBody.id;

    // Verify student reserved points
    const sProfile = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { authorization: `Bearer ${studentSession}` }
    });
    const sData = JSON.parse(sProfile.payload);
    expect(sData.currentPoints).toBe(0);
    expect(sData.reservedPoints).toBe(10);

    // 3. Admin marks reward as received
    const recRes = await app.inject({
      method: 'PUT',
      url: `/api/v1/rewards/requests/${requestId}/receive`,
      headers: { authorization: `Bearer ${adminSession}` }
    });
    expect(recRes.statusCode).toBe(200);
    const recBody = JSON.parse(recRes.payload);
    expect(recBody.status).toBe('Completed');
  });

  // Scenario 5: Challenges & 3-Rejection Abuse Ban
  it('Scenario 5: Challenges & 3-Rejection Abuse Ban', async () => {
    // 1. Admin creates Challenge
    const actRes = await app.inject({
      method: 'POST',
      url: '/api/v1/activities',
      headers: { authorization: `Bearer ${adminSession}` },
      payload: {
        type: 'Challenge',
        name: 'Science Fair Participation',
        description: 'Present project at fair',
        pointValue: 20,
        completionLimit: 1
      }
    });
    expect(actRes.statusCode).toBe(201);
    activityId = JSON.parse(actRes.payload).id;

    // 2. Submit and reject 3 times
    for (let i = 0; i < 3; i++) {
      const subRes = await app.inject({
        method: 'POST',
        url: `/api/v1/activities/${activityId}/verifications`,
        headers: { authorization: `Bearer ${studentSession}` },
        payload: { evidenceDescription: `Attempt ${i + 1}` }
      });
      expect(subRes.statusCode).toBe(201);
      const verId = JSON.parse(subRes.payload).id;

      const revRes = await app.inject({
        method: 'PUT',
        url: `/api/v1/activities/verifications/${verId}/review`,
        headers: { authorization: `Bearer ${adminSession}` },
        payload: { action: 'Rejected', reviewNotes: 'Insufficient evidence' }
      });
      expect(revRes.statusCode).toBe(200);
    }

    // 3. Fourth submission is blocked due to 30-day abuse ban
    const blockedRes = await app.inject({
      method: 'POST',
      url: `/api/v1/activities/${activityId}/verifications`,
      headers: { authorization: `Bearer ${studentSession}` },
      payload: { evidenceDescription: 'Attempt 4 after ban' }
    });
    expect(blockedRes.statusCode).toBe(403);

    // 4. Admin overrides and unbans student
    const unbanRes = await app.inject({
      method: 'PUT',
      url: `/api/v1/activities/bans/${studentId}/${activityId}/unban`,
      headers: { authorization: `Bearer ${adminSession}` }
    });
    expect(unbanRes.statusCode).toBe(200);

    // Verify student can now submit
    const afterUnbanRes = await app.inject({
      method: 'POST',
      url: `/api/v1/activities/${activityId}/verifications`,
      headers: { authorization: `Bearer ${studentSession}` },
      payload: { evidenceDescription: 'Post-unban submission' }
    });
    expect(afterUnbanRes.statusCode).toBe(201);
  });

  // Scenario 6: Voluntary Task Proposals & Messaging
  it('Scenario 6: Voluntary Task Proposals & Messaging', async () => {
    // 1. Student submits proposal
    const propRes = await app.inject({
      method: 'POST',
      url: '/api/v1/proposals',
      headers: { authorization: `Bearer ${studentSession}` },
      payload: { description: 'Organize classroom library books by genre' }
    });
    expect(propRes.statusCode).toBe(201);
    proposalId = JSON.parse(propRes.payload).id;

    // 2. Admin approves and assigns 25 points
    const appRes = await app.inject({
      method: 'PUT',
      url: `/api/v1/proposals/${proposalId}/approve`,
      headers: { authorization: `Bearer ${adminSession}` },
      payload: { assignedPointValue: 25 }
    });
    expect(appRes.statusCode).toBe(200);
    expect(JSON.parse(appRes.payload).status).toBe('Ready to Do');

    // 3. Post message in thread
    const msgRes = await app.inject({
      method: 'POST',
      url: `/api/v1/proposals/${proposalId}/messages`,
      headers: { authorization: `Bearer ${studentSession}` },
      payload: { messageBody: 'Completed organizing section A through D!' }
    });
    expect(msgRes.statusCode).toBe(201);

    // 4. Admin confirms completion
    const compRes = await app.inject({
      method: 'PUT',
      url: `/api/v1/proposals/${proposalId}/complete`,
      headers: { authorization: `Bearer ${adminSession}` }
    });
    expect(compRes.statusCode).toBe(200);
    expect(JSON.parse(compRes.payload).status).toBe('Completed');

    // Student has received 25 points
    const sProfile = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { authorization: `Bearer ${studentSession}` }
    });
    expect(JSON.parse(sProfile.payload).currentPoints).toBe(25);
  });

  // Scenario 7: Rankings (1224) & Top Board Privacy
  it('Scenario 7: Rankings (1224) & Top Board Privacy', async () => {
    const rankRes = await app.inject({
      method: 'GET',
      url: '/api/v1/analytics/rankings?scope=school',
      headers: { authorization: `Bearer ${studentSession}` }
    });
    expect(rankRes.statusCode).toBe(200);
    const body = JSON.parse(rankRes.payload);
    expect(body.scope).toBe('school');
    expect(body.ownRank).toBe(1);
    expect(body.ownPoints).toBe(25);
    expect(body.totalActiveCount).toBeGreaterThanOrEqual(1);
    expect(body.topStudents).toBeDefined();
    expect(body.topStudents[0].studentName).toBe('Alice Wonder');
    expect(body.topStudents[0].currentPoints).toBe(25);
  });

  // Scenario 8: Role-Filtered Point Reports & Exports
  it('Scenario 8: Role-Filtered Point Reports & Exports', async () => {
    // 1. Parameterized report query
    const repRes = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/point-flow?startDate=2026-09-01&endDate=2026-09-30',
      headers: { authorization: `Bearer ${adminSession}` }
    });
    expect(repRes.statusCode).toBe(200);
    const records = JSON.parse(repRes.payload);
    expect(records.length).toBeGreaterThanOrEqual(1);

    // 2. Export to CSV
    const csvRes = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/point-flow/export?format=csv',
      headers: { authorization: `Bearer ${adminSession}` }
    });
    expect(csvRes.statusCode).toBe(200);
    expect(csvRes.headers['content-type']).toContain('text/csv');
    expect(csvRes.payload).toContain('Timestamp');

    // 3. Export to Excel
    const xlsxRes = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/point-flow/export?format=excel',
      headers: { authorization: `Bearer ${adminSession}` }
    });
    expect(xlsxRes.statusCode).toBe(200);
    expect(xlsxRes.headers['content-type']).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(xlsxRes.rawPayload.length).toBeGreaterThan(100);

    // 4. Export to PDF
    const pdfRes = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/point-flow/export?format=pdf',
      headers: { authorization: `Bearer ${adminSession}` }
    });
    expect(pdfRes.statusCode).toBe(200);
    expect(pdfRes.headers['content-type']).toContain('application/pdf');
    expect(pdfRes.rawPayload.slice(0, 4).toString('utf-8')).toBe('%PDF');
  });

  // Scenario 9: Observability & Correlation ID Verification
  it('Scenario 9: Observability & Correlation ID Verification', async () => {
    const corrId = 'test-corr-id-12345';
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/guidance/cards',
      headers: {
        authorization: `Bearer ${studentSession}`,
        'X-Correlation-ID': corrId
      }
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['x-correlation-id']).toBe(corrId);
  });

  // Scenario 10: Session Termination & Logout Verification
  it('Scenario 10: Session Termination & Logout Verification', async () => {
    // 1. Logout
    const logoutRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      headers: { authorization: `Bearer ${studentSession}` }
    });
    expect(logoutRes.statusCode).toBe(200);

    // 2. Attempt subsequent authenticated action with the terminated session
    const meRes = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { authorization: `Bearer ${studentSession}` }
    });
    expect(meRes.statusCode).toBe(401);
  });
});
