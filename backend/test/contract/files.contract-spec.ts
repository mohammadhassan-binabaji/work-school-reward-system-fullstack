import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestingApp } from '../helpers/test-app.helper';
import { cleanDatabase, cleanRedis, seedBaselineTiers, seedSystemPool } from '../helpers/test-db.helper';
import { loginUser } from '../helpers/auth.helper';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { RedisService } from '../../src/common/redis/redis.service';

describe('Files Contract Tests (e2e)', () => {
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

  it('POST /api/v1/files/upload returns 401 Unauthorized when unauthenticated', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/files/upload');

    expect(res.status).toBe(401);
  });

  it('POST /api/v1/files/upload returns 400 Bad Request when authenticated but no file is attached', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/files/upload')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('File is required');
  });

  it('POST /api/v1/files/upload uploads a file successfully and returns 201 with url', async () => {
    const fileBuffer = Buffer.from('dummy file content for contract test');

    const res = await request(app.getHttpServer())
      .post('/api/v1/files/upload')
      .set('Cookie', adminCookie)
      .attach('file', fileBuffer, 'sample.jpg');

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('url');
    expect(typeof res.body.url).toBe('string');
    expect(res.body.url.length).toBeGreaterThan(0);
  });
});
