import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestingApp } from '../helpers/test-app.helper';
import { cleanDatabase, cleanRedis, seedBaselineTiers, seedSystemPool } from '../helpers/test-db.helper';
import { loginUser } from '../helpers/auth.helper';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { RedisService } from '../../src/common/redis/redis.service';

describe('Activities Contract Tests (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: RedisService;
  let adminCookie: string;
  let studentCookie: string;

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

    await request(app.getHttpServer())
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

    const studentAuth = await loginUser(app, '3333333333', 'Password123!');
    studentCookie = studentAuth.cookie;
  });

  it('POST /api/v1/activities validates activity type enum and positive numbers', async () => {
    // Invalid type
    await request(app.getHttpServer())
      .post('/api/v1/activities')
      .set('Cookie', adminCookie)
      .send({
        type: 'INVALID_TYPE',
        title: 'Title',
        description: 'Desc',
        pointValue: 10,
        completionLimit: 1,
      })
      .expect(400);

    // Negative point value
    await request(app.getHttpServer())
      .post('/api/v1/activities')
      .set('Cookie', adminCookie)
      .send({
        type: 'CHALLENGE',
        title: 'Title',
        description: 'Desc',
        pointValue: -5,
        completionLimit: 1,
      })
      .expect(400);
  });

  it('POST /api/v1/activities/:id/submissions validates required textDescription', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/activities/00000000-0000-0000-0000-000000000000/submissions')
      .set('Cookie', studentCookie)
      .send({})
      .expect(400);
  });

  it('POST /api/v1/students/:id/unban validates activityId as UUID', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/students/00000000-0000-0000-0000-000000000000/unban')
      .set('Cookie', adminCookie)
      .send({ activityId: 'not-a-uuid' })
      .expect(400);
  });

  it('GET /api/v1/activities includes per-student progress and verificationStatus for students', async () => {
    // 1. Admin creates an activity
    const activityRes = await request(app.getHttpServer())
      .post('/api/v1/activities')
      .set('Cookie', adminCookie)
      .send({
        type: 'CHALLENGE',
        title: 'Math Marathon',
        description: 'Solve 10 math puzzles',
        pointValue: 50,
        completionLimit: 1,
      })
      .expect(201);
    const activityId = activityRes.body.id;

    // 2. Student lists activities: initial state
    const listRes1 = await request(app.getHttpServer())
      .get('/api/v1/activities')
      .set('Cookie', studentCookie)
      .expect(200);

    expect(Array.isArray(listRes1.body)).toBe(true);
    const item1 = listRes1.body.find((a: any) => a.id === activityId);
    expect(item1).toBeDefined();
    expect(item1.completionCount).toBe(0);
    expect(item1.isBanned).toBe(false);
    expect(item1.isDone).toBe(false);
    expect(item1.verificationStatus).toBeNull();

    // Also verify GET /api/v1/activities/:id
    const detailRes1 = await request(app.getHttpServer())
      .get(`/api/v1/activities/${activityId}`)
      .set('Cookie', studentCookie)
      .expect(200);
    expect(detailRes1.body.completionCount).toBe(0);
    expect(detailRes1.body.isBanned).toBe(false);
    expect(detailRes1.body.isDone).toBe(false);
    expect(detailRes1.body.verificationStatus).toBeNull();

    // 3. Student submits verification: status becomes PENDING
    const subRes = await request(app.getHttpServer())
      .post(`/api/v1/activities/${activityId}/submissions`)
      .set('Cookie', studentCookie)
      .send({ textDescription: 'Here are my solutions' })
      .expect(201);

    const listRes2 = await request(app.getHttpServer())
      .get('/api/v1/activities')
      .set('Cookie', studentCookie)
      .expect(200);
    const item2 = listRes2.body.find((a: any) => a.id === activityId);
    expect(item2.verificationStatus).toBe('PENDING');
    expect(item2.completionCount).toBe(0);
    expect(item2.isDone).toBe(false);

    // 4. Admin accepts verification: completionCount = 1, isDone = true, verificationStatus = ACCEPTED
    await request(app.getHttpServer())
      .post(`/api/v1/verifications/${subRes.body.id}/accept`)
      .set('Cookie', adminCookie)
      .expect(200);

    const listRes3 = await request(app.getHttpServer())
      .get('/api/v1/activities')
      .set('Cookie', studentCookie)
      .expect(200);
    const item3 = listRes3.body.find((a: any) => a.id === activityId);
    expect(item3.completionCount).toBe(1);
    expect(item3.isDone).toBe(true);
    expect(item3.isBanned).toBe(false);
    expect(item3.verificationStatus).toBe('ACCEPTED');

    // 5. Admin listing does not break
    const adminListRes = await request(app.getHttpServer())
      .get('/api/v1/activities')
      .set('Cookie', adminCookie)
      .expect(200);
    expect(Array.isArray(adminListRes.body)).toBe(true);
    const adminItem = adminListRes.body.find((a: any) => a.id === activityId);
    expect(adminItem).toBeDefined();
    expect(adminItem.title).toBe('Math Marathon');
  });

  it('GET /api/v1/activities reflects isBanned: true when student is banned', async () => {
    // Admin creates an activity
    const activityRes = await request(app.getHttpServer())
      .post('/api/v1/activities')
      .set('Cookie', adminCookie)
      .send({
        type: 'CHALLENGE',
        title: 'Science Quiz',
        description: 'Take the weekly science quiz',
        pointValue: 30,
        completionLimit: 2,
      })
      .expect(201);
    const activityId = activityRes.body.id;

    // 3 submissions and rejections
    for (let i = 1; i <= 3; i++) {
      const sub = await request(app.getHttpServer())
        .post(`/api/v1/activities/${activityId}/submissions`)
        .set('Cookie', studentCookie)
        .send({ textDescription: `Attempt #${i}` })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/v1/verifications/${sub.body.id}/reject`)
        .set('Cookie', adminCookie)
        .send({ rejectionReason: `Failed #${i}` })
        .expect(200);
    }

    // Check activity listing for student: isBanned should now be true
    const listRes = await request(app.getHttpServer())
      .get('/api/v1/activities')
      .set('Cookie', studentCookie)
      .expect(200);
    const item = listRes.body.find((a: any) => a.id === activityId);
    expect(item.isBanned).toBe(true);
    expect(item.verificationStatus).toBe('REJECTED');
  });
});

