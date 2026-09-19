import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { prisma } from '../../src/core/prisma.js';
import { closeRedis } from '../../src/core/redis.js';

import { cleanDatabase } from '../test-helpers.js';

describe('Student Task Proposals & Messaging Integration Tests (US6)', () => {
  let app: FastifyInstance;
  let adminSessionId: string;
  let teacherSessionId: string;
  let student1Id: string;
  let student1SessionId: string;
  let student2Id: string;
  let student2SessionId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    await cleanDatabase();

    // Provision admin
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/provision-admin',
      payload: {
        nationalId: '1000000001',
        username: 'admin6',
        password: 'Password123!',
        firstName: 'Admin',
        lastName: 'Six'
      }
    });
    const adminLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { nationalId: '1000000001', password: 'Password123!' }
    });
    adminSessionId = JSON.parse(adminLogin.payload).sessionId;

    // Create teacher
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/users',
      headers: { authorization: `Bearer ${adminSessionId}` },
      payload: {
        nationalId: '2000000001',
        username: 'teacher6',
        password: 'Password123!',
        firstName: 'Teacher',
        lastName: 'Six',
        role: 'TEACHER'
      }
    });
    const tLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { nationalId: '2000000001', password: 'Password123!' }
    });
    teacherSessionId = JSON.parse(tLogin.payload).sessionId;

    // Create student 1
    const s1Res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/users',
      headers: { authorization: `Bearer ${adminSessionId}` },
      payload: {
        nationalId: '3000000001',
        username: 'studentProposal1',
        password: 'Password123!',
        firstName: 'Student',
        lastName: 'One',
        role: 'STUDENT'
      }
    });
    student1Id = JSON.parse(s1Res.payload).id;
    const s1Login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { nationalId: '3000000001', password: 'Password123!' }
    });
    student1SessionId = JSON.parse(s1Login.payload).sessionId;

    // Create student 2
    const s2Res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/users',
      headers: { authorization: `Bearer ${adminSessionId}` },
      payload: {
        nationalId: '3000000002',
        username: 'studentProposal2',
        password: 'Password123!',
        firstName: 'Student',
        lastName: 'Two',
        role: 'STUDENT'
      }
    });
    student2Id = JSON.parse(s2Res.payload).id;
    const s2Login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { nationalId: '3000000002', password: 'Password123!' }
    });
    student2SessionId = JSON.parse(s2Login.payload).sessionId;
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
    await closeRedis();
  });

  let proposal1Id: string;

  it('student 1 submits proposal with initial status Pending to Approve', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/proposals',
      headers: { authorization: `Bearer ${student1SessionId}` },
      payload: {
        description: 'Organize school library bookshelves and sort by category'
      }
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    proposal1Id = body.id;
    expect(body.status).toBe('Pending to Approve');
    expect(body.assignedPointValue).toBeNull();
  });

  it('teachers are strictly blocked from accessing proposals with 403 Forbidden (FR-053)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/proposals',
      headers: { authorization: `Bearer ${teacherSessionId}` }
    });
    expect(res.statusCode).toBe(403);
  });

  it('student cannot cancel proposal in Pending to Approve status (FR-047)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/proposals/${proposal1Id}/cancel`,
      headers: { authorization: `Bearer ${student1SessionId}` }
    });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.payload);
    expect(body.message).toContain('Ready to Do');
  });

  it('admin approves proposal and assigns positive points (status -> Ready to Do)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/proposals/${proposal1Id}/approve`,
      headers: { authorization: `Bearer ${adminSessionId}` },
      payload: { assignedPointValue: 20 }
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.status).toBe('Ready to Do');
    expect(body.assignedPointValue).toBe(20);
  });

  it('admin adjusts point amount while in Ready to Do', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/api/v1/proposals/${proposal1Id}/points`,
      headers: { authorization: `Bearer ${adminSessionId}` },
      payload: { assignedPointValue: 25 }
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.assignedPointValue).toBe(25);
  });

  it('bidirectional messaging thread between student and admin', async () => {
    // Student posts message
    const msg1Res = await app.inject({
      method: 'POST',
      url: `/api/v1/proposals/${proposal1Id}/messages`,
      headers: { authorization: `Bearer ${student1SessionId}` },
      payload: { messageBody: 'I have started sorting section A!' }
    });
    expect(msg1Res.statusCode).toBe(201);

    // Admin posts reply
    const msg2Res = await app.inject({
      method: 'POST',
      url: `/api/v1/proposals/${proposal1Id}/messages`,
      headers: { authorization: `Bearer ${adminSessionId}` },
      payload: { messageBody: 'Looks great, thank you!' }
    });
    expect(msg2Res.statusCode).toBe(201);

    // Student queries thread
    const listRes = await app.inject({
      method: 'GET',
      url: `/api/v1/proposals/${proposal1Id}/messages`,
      headers: { authorization: `Bearer ${student1SessionId}` }
    });
    expect(listRes.statusCode).toBe(200);
    const messages = JSON.parse(listRes.payload);
    expect(messages.length).toBe(2);
  });

  it('student 2 is blocked from viewing student 1 proposal or messages', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/proposals/${proposal1Id}`,
      headers: { authorization: `Bearer ${student2SessionId}` }
    });
    expect(res.statusCode).toBe(403);
  });

  it('student can cancel proposal while in Ready to Do status', async () => {
    // Student 2 creates a proposal
    const p2Res = await app.inject({
      method: 'POST',
      url: '/api/v1/proposals',
      headers: { authorization: `Bearer ${student2SessionId}` },
      payload: { description: 'Water garden plants' }
    });
    const p2Id = JSON.parse(p2Res.payload).id;

    // Admin approves it
    await app.inject({
      method: 'POST',
      url: `/api/v1/proposals/${p2Id}/approve`,
      headers: { authorization: `Bearer ${adminSessionId}` },
      payload: { assignedPointValue: 15 }
    });

    // Student 2 cancels it
    const cancelRes = await app.inject({
      method: 'POST',
      url: `/api/v1/proposals/${p2Id}/cancel`,
      headers: { authorization: `Bearer ${student2SessionId}` }
    });
    expect(cancelRes.statusCode).toBe(200);

    const record = await prisma.studentTaskProposal.findUnique({ where: { id: p2Id } });
    expect(record?.status).toBe('Canceled');
  });

  it('admin confirms completion and points are awarded to student balance', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/proposals/${proposal1Id}/complete`,
      headers: { authorization: `Bearer ${adminSessionId}` }
    });
    expect(res.statusCode).toBe(200);

    const record = await prisma.studentTaskProposal.findUnique({ where: { id: proposal1Id } });
    expect(record?.status).toBe('Completed');

    const student = await prisma.student.findUnique({ where: { id: student1Id } });
    expect(student?.currentPoints).toBe(25);
    expect(student?.highestBalance).toBe(25);

    // Audit log created
    const audit = await prisma.auditRecord.findFirst({
      where: { actionType: 'PROPOSAL_AWARD', recipientId: student1Id }
    });
    expect(audit).toBeDefined();
    expect(audit?.pointAmount).toBe(25);
  });
});
