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
});

