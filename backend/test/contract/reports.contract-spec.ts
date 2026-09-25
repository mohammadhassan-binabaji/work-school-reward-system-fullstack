import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestingApp } from '../helpers/test-app.helper';
import { cleanDatabase, cleanRedis, seedBaselineTiers, seedSystemPool } from '../helpers/test-db.helper';
import { loginUser } from '../helpers/auth.helper';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { RedisService } from '../../src/common/redis/redis.service';

describe('Reports Contract Tests (e2e)', () => {
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

  it('GET /api/v1/reports/point-flow requires authentication', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/reports/point-flow');
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/reports/point-flow/export validates format enum (csv, xlsx, pdf)', async () => {
    // Missing format
    await request(app.getHttpServer())
      .get('/api/v1/reports/point-flow/export')
      .set('Cookie', adminCookie)
      .expect(400);

    // Invalid format
    await request(app.getHttpServer())
      .get('/api/v1/reports/point-flow/export?format=doc')
      .set('Cookie', adminCookie)
      .expect(400);
  });
});

