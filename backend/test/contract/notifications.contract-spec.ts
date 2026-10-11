import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestingApp } from '../helpers/test-app.helper';
import { cleanDatabase, cleanRedis, seedBaselineTiers, seedSystemPool } from '../helpers/test-db.helper';
import { loginUser } from '../helpers/auth.helper';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { RedisService } from '../../src/common/redis/redis.service';

describe('Notifications Contract Tests (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: RedisService;
  let adminCookie: string;
  let adminId: string;

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
    adminId = adminAuth.user.id;
  });

  it('GET /api/v1/notifications rejects unauthorized access with 401', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/notifications')
      .expect(401);
  });

  it('GET /api/v1/notifications validates query parameters schema', async () => {
    // Invalid page (< 1)
    await request(app.getHttpServer())
      .get('/api/v1/notifications?page=0')
      .set('Cookie', adminCookie)
      .expect(400);

    // Invalid limit (> 50)
    await request(app.getHttpServer())
      .get('/api/v1/notifications?limit=100')
      .set('Cookie', adminCookie)
      .expect(400);

    // Invalid status enum
    await request(app.getHttpServer())
      .get('/api/v1/notifications?status=INVALID')
      .set('Cookie', adminCookie)
      .expect(400);
  });

  it('GET /api/v1/notifications returns paginated envelope structure', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/notifications')
      .set('Cookie', adminCookie)
      .expect(200);

    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body).toHaveProperty('meta');
    expect(res.body.meta).toEqual({
      totalItems: 0,
      itemCount: 0,
      itemsPerPage: 20,
      totalPages: 0,
      currentPage: 1,
    });
  });

  it('GET /api/v1/notifications/unread-count returns unread count structure', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/notifications/unread-count')
      .set('Cookie', adminCookie)
      .expect(200);

    expect(res.body).toEqual({ unreadCount: 0 });
  });

  it('PATCH /api/v1/notifications/:id/read validates UUID parameter', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/notifications/invalid-uuid/read')
      .set('Cookie', adminCookie)
      .expect(400);
  });

  it('PATCH /api/v1/notifications/:id/read returns 404 for non-existent notification', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/notifications/00000000-0000-0000-0000-000000000000/read')
      .set('Cookie', adminCookie)
      .expect(404);
  });

  it('PATCH /api/v1/notifications/read-all returns updatedCount structure', async () => {
    const res = await request(app.getHttpServer())
      .patch('/api/v1/notifications/read-all')
      .set('Cookie', adminCookie)
      .expect(200);

    expect(res.body).toHaveProperty('updatedCount');
    expect(typeof res.body.updatedCount).toBe('number');
  });
});
