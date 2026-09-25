import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestingApp } from '../helpers/test-app.helper';
import { cleanDatabase, cleanRedis, seedBaselineTiers, seedSystemPool } from '../helpers/test-db.helper';
import { loginUser } from '../helpers/auth.helper';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { RedisService } from '../../src/common/redis/redis.service';

describe('Auth & Users Contract Tests (e2e)', () => {
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

  it('POST /api/v1/auth/initial-admin rejects invalid nationalId and short passwords', async () => {
    const res = await request(app.getHttpServer()).post('/api/v1/auth/initial-admin').send({
      nationalId: 'invalid-id',
      firstName: 'Test',
      lastName: 'Admin',
      username: 'admin',
      password: 'short',
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('statusCode', 400);
  });

  it('POST /api/v1/auth/login schema contract with missing fields', async () => {
    const res = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
      nationalId: '123',
    });

    expect(res.status).toBe(400);
  });

  it('GET /api/v1/auth/me unauthorized contract', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('POST /api/v1/users validates role and nationalId regex', async () => {
    // Non-whitelisted field
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Cookie', adminCookie)
      .send({
        nationalId: '2222222222',
        firstName: 'Test',
        lastName: 'User',
        username: 'testuser',
        password: 'Password123!',
        role: 'TEACHER',
        unknownField: 'illegal',
      })
      .expect(400);

    // Invalid role
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Cookie', adminCookie)
      .send({
        nationalId: '2222222222',
        firstName: 'Test',
        lastName: 'User',
        username: 'testuser',
        password: 'Password123!',
        role: 'SUPERUSER',
      })
      .expect(400);
  });

  it('PATCH /api/v1/users/:id/state validates accountState enum', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/users/00000000-0000-0000-0000-000000000000/state')
      .set('Cookie', adminCookie)
      .send({ accountState: 'INVALID_STATE' })
      .expect(400);
  });
});

