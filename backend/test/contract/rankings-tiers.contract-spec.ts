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

describe('Rankings & Tiers Contract Tests (e2e)', () => {
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

  it('PUT /api/v1/tiers validates 5-tier requirement and non-negative thresholds', async () => {
    // Array with only 3 tiers (must be 5)
    await request(app.getHttpServer())
      .put('/api/v1/tiers')
      .set('Cookie', adminCookie)
      .send({
        tiers: [
          { tierNumber: 1, name: 'Bronze', minPointsThreshold: 0 },
          { tierNumber: 2, name: 'Silver', minPointsThreshold: 100 },
          { tierNumber: 3, name: 'Gold', minPointsThreshold: 250 },
        ],
      })
      .expect(400);

    // Negative threshold
    await request(app.getHttpServer())
      .put('/api/v1/tiers')
      .set('Cookie', adminCookie)
      .send({
        tiers: [
          { tierNumber: 1, name: 'Bronze', minPointsThreshold: -10 },
          { tierNumber: 2, name: 'Silver', minPointsThreshold: 100 },
          { tierNumber: 3, name: 'Gold', minPointsThreshold: 250 },
          { tierNumber: 4, name: 'Platinum', minPointsThreshold: 500 },
          { tierNumber: 5, name: 'Diamond', minPointsThreshold: 1000 },
        ],
      })
      .expect(400);
  });

  it('GET /api/v1/rankings/students/:id/snapshot-history validates UUID format', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/rankings/students/not-a-uuid/snapshot-history')
      .set('Cookie', adminCookie)
      .expect(400);
  });

  it('GET /api/v1/rankings/students/:id/balance-history validates UUID format and requires auth', async () => {
    // Unauthenticated request
    await request(app.getHttpServer())
      .get('/api/v1/rankings/students/a0000000-0000-0000-0000-000000000001/balance-history')
      .expect(401);

    // Invalid UUID
    await request(app.getHttpServer())
      .get('/api/v1/rankings/students/not-a-uuid/balance-history')
      .set('Cookie', adminCookie)
      .expect(400);

    // Valid UUID returns expected response envelope with data and pagination
    const res = await request(app.getHttpServer())
      .get('/api/v1/rankings/students/a0000000-0000-0000-0000-000000000001/balance-history?limit=7')
      .set('Cookie', adminCookie)
      .expect(200);

    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('pagination');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination.limit).toBe(7);
    expect(typeof res.body.pagination.hasMore).toBe('boolean');
  });
});
