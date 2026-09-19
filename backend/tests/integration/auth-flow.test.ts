import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { authRoutes } from '../../src/modules/auth/auth.routes.js';
import { prisma } from '../../src/core/prisma.js';
import { closeRedis } from '../../src/core/redis.js';

describe('Auth Flow Integration Tests (US1)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Clean up test data
    await prisma.studentActivityBan.deleteMany();
    await prisma.verificationAttachment.deleteMany();
    await prisma.activityVerificationRequest.deleteMany();
    await prisma.rewardRequest.deleteMany();
    await prisma.taskProposalMessage.deleteMany();
    await prisma.studentTaskProposal.deleteMany();
    await prisma.dailyStudentBalanceSnapshot.deleteMany();
    await prisma.auditRecord.deleteMany();
    await prisma.teacherClassSubject.deleteMany();
    await prisma.student.deleteMany();
    await prisma.teacher.deleteMany();
    await prisma.administrator.deleteMany();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
    await closeRedis();
  });

  it('should provision initial admin successfully', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/provision-admin',
      payload: {
        nationalId: '1000000001',
        username: 'superadmin',
        password: 'Password123!',
        firstName: 'Super',
        lastName: 'Admin'
      }
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.nationalId).toBe('1000000001');
    expect(body.username).toBe('superadmin');
    expect(body.role).toBe('ADMIN');
    expect(body.passwordHash).toBeUndefined();
  });

  it('should reject second initial admin provisioning with 409 Conflict', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/provision-admin',
      payload: {
        nationalId: '1000000002',
        username: 'anotheradmin',
        password: 'Password123!',
        firstName: 'Another',
        lastName: 'Admin'
      }
    });

    expect(res.statusCode).toBe(409);
  });

  it('should authenticate admin and issue session cookie', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        nationalId: '1000000001',
        password: 'Password123!'
      }
    });

    expect(res.statusCode).toBe(200);
    const cookies = res.cookies;
    const sessionCookie = cookies.find((c) => c.name === 'sessionId');
    expect(sessionCookie).toBeDefined();

    const body = JSON.parse(res.payload);
    expect(body.sessionId).toBeDefined();
    expect(body.user.nationalId).toBe('1000000001');
  });

  it('should reject login with wrong password without user enumeration', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        nationalId: '1000000001',
        password: 'WrongPassword!'
      }
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.payload);
    expect(body.message).toContain('Invalid national ID or password');
  });

  it('should reject login with invalid national ID format with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        nationalId: '123', // not 10 digits
        password: 'Password123!'
      }
    });

    expect(res.statusCode).toBe(400);
  });

  it('admin can create teacher and student accounts', async () => {
    // 1. Login as admin
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        nationalId: '1000000001',
        password: 'Password123!'
      }
    });
    const { sessionId } = JSON.parse(loginRes.payload);

    // 2. Create teacher
    const teacherRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/users',
      headers: {
        authorization: `Bearer ${sessionId}`
      },
      payload: {
        nationalId: '2000000001',
        username: 'teacher1',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        role: 'TEACHER'
      }
    });
    expect(teacherRes.statusCode).toBe(201);
    const teacherBody = JSON.parse(teacherRes.payload);
    expect(teacherBody.role).toBe('TEACHER');

    // 3. Create student
    const studentRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/users',
      headers: {
        authorization: `Bearer ${sessionId}`
      },
      payload: {
        nationalId: '3000000001',
        username: 'student1',
        password: 'Password123!',
        firstName: 'Alice',
        lastName: 'Smith',
        role: 'STUDENT'
      }
    });
    expect(studentRes.statusCode).toBe(201);
    const studentBody = JSON.parse(studentRes.payload);
    expect(studentBody.role).toBe('STUDENT');
  });

  it('student cannot create user accounts (403 Forbidden)', async () => {
    // Login as student
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        nationalId: '3000000001',
        password: 'Password123!'
      }
    });
    const { sessionId } = JSON.parse(loginRes.payload);

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/users',
      headers: {
        authorization: `Bearer ${sessionId}`
      },
      payload: {
        nationalId: '4000000001',
        username: 'intruder',
        password: 'Password123!',
        firstName: 'Bad',
        lastName: 'Actor',
        role: 'STUDENT'
      }
    });
    expect(res.statusCode).toBe(403);
  });

  it('should logout and destroy session', async () => {
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        nationalId: '3000000001',
        password: 'Password123!'
      }
    });
    const { sessionId } = JSON.parse(loginRes.payload);

    // Verify /me works
    const meRes = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: {
        authorization: `Bearer ${sessionId}`
      }
    });
    expect(meRes.statusCode).toBe(200);

    // Logout
    const logoutRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      headers: {
        authorization: `Bearer ${sessionId}`
      }
    });
    expect(logoutRes.statusCode).toBe(200);

    // Verify /me now fails with 401
    const meAfterRes = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: {
        authorization: `Bearer ${sessionId}`
      }
    });
    expect(meAfterRes.statusCode).toBe(401);
  });
});
