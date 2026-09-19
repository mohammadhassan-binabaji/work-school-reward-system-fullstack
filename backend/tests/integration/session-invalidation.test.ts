import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { authRoutes } from '../../src/modules/auth/auth.routes.js';
import { prisma } from '../../src/core/prisma.js';
import { closeRedis, redis } from '../../src/core/redis.js';
import { SessionStore } from '../../src/core/session.js';

describe('Instant Session Invalidation Integration Tests (US1)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
    await closeRedis();
  });

  it('should immediately invalidate all active sessions in Redis when user is deactivated', async () => {
    // 1. Create a student to test session invalidation
    const student = await prisma.student.upsert({
      where: { nationalId: '5555555555' },
      update: { accountState: 'Active' },
      create: {
        nationalId: '5555555555',
        username: 'teststudent55',
        firstName: 'Test',
        lastName: 'Student',
        passwordHash: 'dummyHash',
        accountState: 'Active'
      }
    });

    // 2. Create two active sessions for this user (e.g. mobile and desktop)
    const session1 = await SessionStore.createSession({
      userId: student.id,
      role: 'STUDENT',
      nationalId: student.nationalId,
      firstName: student.firstName,
      lastName: student.lastName,
      accountState: 'Active'
    });

    const session2 = await SessionStore.createSession({
      userId: student.id,
      role: 'STUDENT',
      nationalId: student.nationalId,
      firstName: student.firstName,
      lastName: student.lastName,
      accountState: 'Active'
    });

    // Verify both sessions exist in Redis
    expect(await SessionStore.getSession(session1.sessionId)).not.toBeNull();
    expect(await SessionStore.getSession(session2.sessionId)).not.toBeNull();

    // Verify /auth/me succeeds with session1
    const res1 = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { authorization: `Bearer ${session1.sessionId}` }
    });
    expect(res1.statusCode).toBe(200);

    // 3. User state changes: Deactivate student and invoke revocation
    await prisma.student.update({
      where: { id: student.id },
      data: { accountState: 'Deactivated' }
    });
    await SessionStore.revokeUserSessions(student.id);

    // 4. Invariant: 0-second session invalidation
    // Both sessions in Redis must be completely gone
    expect(await SessionStore.getSession(session1.sessionId)).toBeNull();
    expect(await SessionStore.getSession(session2.sessionId)).toBeNull();

    const userKeyMembers = await redis.smembers(`user_sessions:${student.id}`);
    expect(userKeyMembers.length).toBe(0);

    // 5. Subsequent request with session1 MUST immediately return 401
    const resAfter1 = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { authorization: `Bearer ${session1.sessionId}` }
    });
    expect(resAfter1.statusCode).toBe(401);

    // Subsequent request with session2 MUST immediately return 401
    const resAfter2 = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { authorization: `Bearer ${session2.sessionId}` }
    });
    expect(resAfter2.statusCode).toBe(401);
  });
});
