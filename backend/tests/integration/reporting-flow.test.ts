import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { prisma } from '../../src/core/prisma.js';
import { closeRedis } from '../../src/core/redis.js';
import { cleanDatabase } from '../test-helpers.js';

describe('Reporting Flow & Exports Integration Tests (US9 - T055)', () => {
  let app: FastifyInstance;
  let adminSessionId: string;
  let teacherId: string;
  let teacherSessionId: string;
  let studentId: string;
  let classId: string;
  let subjectId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    await cleanDatabase();

    // 1. Provision admin
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/provision-admin',
      payload: {
        nationalId: '1000000001',
        username: 'admin_reporting',
        password: 'Password123!',
        firstName: 'Admin',
        lastName: 'Reporting'
      }
    });
    const adminLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { nationalId: '1000000001', password: 'Password123!' }
    });
    adminSessionId = JSON.parse(adminLogin.payload).sessionId;

    // 2. Class & Subject
    const cRes = await app.inject({
      method: 'POST',
      url: '/api/v1/academic/classes',
      headers: { authorization: `Bearer ${adminSessionId}` },
      payload: { name: 'Reporting Class' }
    });
    classId = JSON.parse(cRes.payload).id;

    const subRes = await app.inject({
      method: 'POST',
      url: '/api/v1/academic/subjects',
      headers: { authorization: `Bearer ${adminSessionId}` },
      payload: { name: 'Reporting Subject' }
    });
    subjectId = JSON.parse(subRes.payload).id;

    // 3. Teacher
    const tRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/users',
      headers: { authorization: `Bearer ${adminSessionId}` },
      payload: {
        nationalId: '2000000001',
        username: 'teacher_rep',
        password: 'Password123!',
        firstName: 'Teacher',
        lastName: 'Rep',
        role: 'TEACHER'
      }
    });
    teacherId = JSON.parse(tRes.payload).id;

    const tLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { nationalId: '2000000001', password: 'Password123!' }
    });
    teacherSessionId = JSON.parse(tLogin.payload).sessionId;

    // Assign Teacher to Class
    await app.inject({
      method: 'POST',
      url: '/api/v1/academic/assignments',
      headers: { authorization: `Bearer ${adminSessionId}` },
      payload: { teacherId, classId, subjectId }
    });

    // 4. Student
    const sRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/users',
      headers: { authorization: `Bearer ${adminSessionId}` },
      payload: {
        nationalId: '3000000001',
        username: 'student_rep',
        password: 'Password123!',
        firstName: 'Student',
        lastName: 'Rep',
        role: 'STUDENT',
        classId
      }
    });
    studentId = JSON.parse(sRes.payload).id;

    // 5. Populate pool & point awards
    await prisma.systemPointPool.upsert({
      where: { id: 'singleton' },
      update: { availableBalance: 10000, totalAllocated: 10000 },
      create: { id: 'singleton', availableBalance: 10000, totalAllocated: 10000 }
    });

    await app.inject({
      method: 'POST',
      url: '/api/v1/points/pool/transfer',
      headers: { authorization: `Bearer ${adminSessionId}` },
      payload: { teacherId, pointAmount: 1000 }
    });

    const taskRes = await app.inject({
      method: 'POST',
      url: '/api/v1/points/tasks',
      headers: { authorization: `Bearer ${adminSessionId}` },
      payload: {
        name: 'Science Project Award',
        options: [25, 50]
      }
    });
    const taskId = JSON.parse(taskRes.payload).id;

    await app.inject({
      method: 'POST',
      url: '/api/v1/points/award',
      headers: { authorization: `Bearer ${teacherSessionId}` },
      payload: {
        studentId,
        taskId,
        pointOption: 50
      }
    });
  });

  afterAll(async () => {
    await cleanDatabase();
    await app.close();
    await closeRedis();
  });

  it('filters point flow reports by actionType', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/point-flow?actionType=TEACHER_AWARD',
      headers: { authorization: `Bearer ${adminSessionId}` }
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.length).toBeGreaterThanOrEqual(1);
    for (const r of body) {
      expect(r.actionType).toBe('TEACHER_AWARD');
    }
  });

  it('filters point flow reports by studentId', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/reports/point-flow?studentId=${studentId}`,
      headers: { authorization: `Bearer ${adminSessionId}` }
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.length).toBeGreaterThanOrEqual(1);
    for (const r of body) {
      expect(
        r.recipientId === studentId ||
        r.sourceId === studentId ||
        r.actorId === studentId ||
        (r.resultingBalanceState && r.resultingBalanceState.studentId === studentId)
      ).toBe(true);
    }
  });

  it('filters point flow reports by classId', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/reports/point-flow?classId=${classId}`,
      headers: { authorization: `Bearer ${adminSessionId}` }
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.length).toBeGreaterThanOrEqual(1);
  });

  it('exports filtered report as CSV with streaming headers', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/point-flow/export?format=csv',
      headers: { authorization: `Bearer ${adminSessionId}` }
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('attachment; filename="point-flow-report.csv"');
    expect(res.payload).toContain('Timestamp');
    expect(res.payload).toContain('Action Type');
    expect(res.payload).toContain('TEACHER_AWARD');
  });

  it('exports filtered report as Excel workbook buffer', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/point-flow/export?format=excel',
      headers: { authorization: `Bearer ${adminSessionId}` }
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(res.headers['content-disposition']).toContain('attachment; filename="point-flow-report.xlsx"');
    expect(res.rawPayload.length).toBeGreaterThan(100);
  });

  it('exports filtered report as PDF buffer with table layout', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/point-flow/export?format=pdf',
      headers: { authorization: `Bearer ${adminSessionId}` }
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.headers['content-disposition']).toContain('attachment; filename="point-flow-report.pdf"');
    expect(res.rawPayload.length).toBeGreaterThan(100);
    // PDF files begin with %PDF
    const header = res.rawPayload.slice(0, 4).toString('utf-8');
    expect(header).toBe('%PDF');
  });
});
