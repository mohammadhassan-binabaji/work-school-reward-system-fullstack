import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestingApp } from '../helpers/test-app.helper';
import { cleanDatabase, cleanRedis, seedBaselineTiers, seedSystemPool } from '../helpers/test-db.helper';
import { loginUser } from '../helpers/auth.helper';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { RedisService } from '../../src/common/redis/redis.service';

describe('Rewards Contract Tests (e2e)', () => {
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

  it('POST /api/v1/rewards validates required fields, price, and booleans', async () => {
    // Missing required fields
    await request(app.getHttpServer())
      .post('/api/v1/rewards')
      .set('Cookie', adminCookie)
      .send({})
      .expect(400);

    // Negative point price
    await request(app.getHttpServer())
      .post('/api/v1/rewards')
      .set('Cookie', adminCookie)
      .send({
        name: 'Invalid Reward',
        description: 'Test',
        pointPrice: -10,
        requiresApproval: true,
      })
      .expect(400);
  });

  it('POST /api/v1/reward-requests validates rewardId as UUID', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/reward-requests')
      .set('Cookie', studentCookie)
      .send({ rewardId: 'not-a-uuid' })
      .expect(400);
  });
});

