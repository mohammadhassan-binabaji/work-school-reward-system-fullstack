import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestingApp } from '../helpers/test-app.helper';
import { cleanDatabase, cleanRedis, seedBaselineTiers, seedSystemPool } from '../helpers/test-db.helper';
import { loginUser } from '../helpers/auth.helper';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { RedisService } from '../../src/common/redis/redis.service';

describe('Auth & RBAC Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: RedisService;

  let adminCookie: string;
  let adminSessionId: string;
  let teacherCookie: string;
  let studentCookie: string;
  let teacherId: string;

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

    // Create Initial Admin
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
    adminSessionId = adminAuth.sessionId;

    // Create Teacher
    const tRes = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Cookie', adminCookie)
      .send({
        nationalId: '2222222222',
        firstName: 'Teacher',
        lastName: 'One',
        username: 'teacher1',
        password: 'Password123!',
        role: 'TEACHER',
      })
      .expect(201);
    teacherId = tRes.body.id;
    const teacherAuth = await loginUser(app, '2222222222', 'Password123!');
    teacherCookie = teacherAuth.cookie;

    // Create Student
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Cookie', adminCookie)
      .send({
        nationalId: '3333333333',
        firstName: 'Student',
        lastName: 'One',
        username: 'student1',
        password: 'Password123!',
        role: 'STUDENT',
      })
      .expect(201);
    const studentAuth = await loginUser(app, '3333333333', 'Password123!');
    studentCookie = studentAuth.cookie;
  });

  it('rejects access without valid session header or cookie (401)', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/users');
    expect(res.status).toBe(401);
  });

  it('supports authentication via Cookie, Bearer Token, and x-session-id header', async () => {
    // Via Cookie
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', adminCookie)
      .expect(200);

    // Via Bearer Token
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${adminSessionId}`)
      .expect(200);

    // Via x-session-id Header
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('x-session-id', adminSessionId)
      .expect(200);
  });

  it('enforces RBAC: student cannot access Admin routes (403)', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Cookie', studentCookie)
      .expect(403);

    await request(app.getHttpServer())
      .post('/api/v1/classes')
      .set('Cookie', studentCookie)
      .send({ name: 'Unauthorized Class' })
      .expect(403);
  });

  it('enforces RBAC: teacher cannot access Admin-only routes (403)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/points/pool/balance')
      .set('Cookie', teacherCookie)
      .send({ balance: 50000 })
      .expect(403);

    await request(app.getHttpServer())
      .post('/api/v1/rewards')
      .set('Cookie', teacherCookie)
      .send({
        name: 'Forbidden Reward',
        description: 'Desc',
        pointPrice: 50,
        requiresApproval: false,
      })
      .expect(403);
  });

  it('enforces RBAC: admin and student cannot access Teacher-only award route (403)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/points/teacher-award')
      .set('Cookie', adminCookie)
      .send({})
      .expect(403);

    await request(app.getHttpServer())
      .post('/api/v1/points/teacher-award')
      .set('Cookie', studentCookie)
      .send({})
      .expect(403);
  });

  it('deactivates teacher and blocks further actions while preserving account (FR-012)', async () => {
    // Admin deactivates teacher
    await request(app.getHttpServer())
      .patch(`/api/v1/users/${teacherId}/state`)
      .set('Cookie', adminCookie)
      .send({ accountState: 'DEACTIVATED' })
      .expect(200);

    // Deactivated teacher login or action should be rejected
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        nationalId: '2222222222',
        password: 'Password123!',
      })
      .expect(401);
  });

  it('handles logout and invalidates session in Redis', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Cookie', adminCookie)
      .expect(200);

    // After logout, request with previous session fails
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', adminCookie)
      .expect(401);
  });
});

