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

describe('Guidance Cards Contract Tests (e2e)', () => {
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

  it('POST /api/v1/guidance-cards validates required fields', async () => {
    // Missing all fields
    await request(app.getHttpServer())
      .post('/api/v1/guidance-cards')
      .set('Cookie', adminCookie)
      .send({})
      .expect(400);

    // Missing categoryId, logoKey and pointRangeLabel
    await request(app.getHttpServer())
      .post('/api/v1/guidance-cards')
      .set('Cookie', adminCookie)
      .send({
        title: 'Title only',
        description: 'Description',
      })
      .expect(400);

    // Invalid categoryId (not UUID)
    await request(app.getHttpServer())
      .post('/api/v1/guidance-cards')
      .set('Cookie', adminCookie)
      .send({
        categoryId: 'not-a-uuid',
        title: 'Title',
        description: 'Desc',
        logoKey: 'shield',
        pointRangeLabel: '10 pts',
      })
      .expect(400);
  });

  it('POST /api/v1/guidance-categories validates required fields', async () => {
    // Missing title
    await request(app.getHttpServer())
      .post('/api/v1/guidance-categories')
      .set('Cookie', adminCookie)
      .send({})
      .expect(400);
  });

  it('PATCH /api/v1/guidance-categories/:id validates status enum', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/guidance-categories/00000000-0000-0000-0000-000000000000')
      .set('Cookie', adminCookie)
      .send({ status: 'INVALID_STATUS' })
      .expect(400);
  });

  it('PATCH /api/v1/guidance-cards/:id validates status enum', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/guidance-cards/00000000-0000-0000-0000-000000000000')
      .set('Cookie', adminCookie)
      .send({ status: 'INVALID_STATUS' })
      .expect(400);
  });
});
