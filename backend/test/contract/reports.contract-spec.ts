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
import { ActionType, ActorRole, RecipientType, SourceType } from '@prisma/client';

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

  it('GET /api/v1/reports/point-flow validates excludeActionType enum', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/reports/point-flow?excludeActionType=INVALID_ENUM')
      .set('Cookie', adminCookie);
    expect(res.status).toBe(400);
  });

  it('GET /api/v1/reports/point-flow rejects identical actionType and excludeActionType', async () => {
    const res = await request(app.getHttpServer())
      .get(
        '/api/v1/reports/point-flow?actionType=POOL_FUND_TEACHER&excludeActionType=POOL_FUND_TEACHER',
      )
      .set('Cookie', adminCookie);
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('actionType and excludeActionType cannot be identical');
  });

  it('GET /api/v1/reports/point-flow excludes specified actionType records', async () => {
    await prisma.pointAuditLog.createMany({
      data: [
        {
          correlationId: 'corr-1',
          actorRole: ActorRole.ADMIN,
          sourceType: SourceType.SYSTEM_POOL,
          recipientType: RecipientType.TEACHER,
          amount: 100,
          actionType: ActionType.POOL_FUND_TEACHER,
        },
        {
          correlationId: 'corr-2',
          actorRole: ActorRole.ADMIN,
          sourceType: SourceType.STUDENT_RESERVED,
          recipientType: RecipientType.NONE,
          amount: 50,
          actionType: ActionType.REWARD_RECEIVE_COMPLETE,
        },
      ],
    });

    const resAll = await request(app.getHttpServer())
      .get('/api/v1/reports/point-flow')
      .set('Cookie', adminCookie);
    expect(resAll.status).toBe(200);
    expect(resAll.body.total).toBe(2);

    const resFiltered = await request(app.getHttpServer())
      .get('/api/v1/reports/point-flow?excludeActionType=REWARD_RECEIVE_COMPLETE')
      .set('Cookie', adminCookie);
    expect(resFiltered.status).toBe(200);
    expect(resFiltered.body.total).toBe(1);
    expect(resFiltered.body.data[0].actionType).toBe(ActionType.POOL_FUND_TEACHER);
  });
});
