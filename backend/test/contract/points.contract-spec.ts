import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestingApp } from '../helpers/test-app.helper';
import {
  cleanDatabase,
  cleanRedis,
  seedBaselineTiers,
  seedSystemPool,
} from '../helpers/test-db.helper';
import { loginUser } from '../helpers/auth.helper';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { RedisService } from '../../src/common/redis/redis.service';

describe('Points Contract Tests (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: RedisService;
  let adminCookie: string;

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
  });

  it('POST /api/v1/points/pool/balance validates non-negative balance', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/points/pool/balance')
      .set('Cookie', adminCookie)
      .send({ balance: -500 })
      .expect(400);
  });

  it('POST /api/v1/points/pool/fund-teacher validates positive amount and UUID', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/points/pool/fund-teacher')
      .set('Cookie', adminCookie)
      .send({
        teacherId: 'not-a-uuid',
        amount: 0,
      })
      .expect(400);
  });

  it('POST /api/v1/points/tasks validates options structure and positive point values', async () => {
    // Missing options
    await request(app.getHttpServer())
      .post('/api/v1/points/tasks')
      .set('Cookie', adminCookie)
      .send({ name: 'Task without options' })
      .expect(400);

    // Negative option points
    await request(app.getHttpServer())
      .post('/api/v1/points/tasks')
      .set('Cookie', adminCookie)
      .send({
        name: 'Invalid Task',
        options: [{ points: -10, label: 'Bad' }],
      })
      .expect(400);
  });

  it('POST /api/v1/points/admin-adjust validates required reason and non-zero amount', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/points/admin-adjust')
      .set('Cookie', adminCookie)
      .send({
        studentId: '00000000-0000-0000-0000-000000000000',
        amount: 0,
      })
      .expect(400);
  });
});
