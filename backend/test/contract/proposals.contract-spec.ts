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

describe('Proposals Contract Tests (e2e)', () => {
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

  it('POST /api/v1/proposals validates description requirement', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/proposals')
      .set('Cookie', studentCookie)
      .send({})
      .expect(400);
  });

  it('POST /api/v1/proposals/:id/approve validates positive point amount', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/proposals/00000000-0000-0000-0000-000000000000/approve')
      .set('Cookie', adminCookie)
      .send({ assignedPointValue: -10 })
      .expect(400);
  });

  it('POST /api/v1/proposals/:id/messages validates non-empty message', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/proposals/00000000-0000-0000-0000-000000000000/messages')
      .set('Cookie', studentCookie)
      .send({})
      .expect(400);
  });

  it('POST /api/v1/proposals/:id/decline persists and returns declineReason, visible in GET', async () => {
    const proposalRes = await request(app.getHttpServer())
      .post('/api/v1/proposals')
      .set('Cookie', studentCookie)
      .send({ description: 'Contract proposal decline test' })
      .expect(201);
    const proposalId = proposalRes.body.id;

    const declineRes = await request(app.getHttpServer())
      .post(`/api/v1/proposals/${proposalId}/decline`)
      .set('Cookie', adminCookie)
      .send({ declineReason: 'Budget constraints for voluntary activity' })
      .expect(200);

    expect(declineRes.body.status).toBe('DECLINED');
    expect(declineRes.body.declineReason).toBe('Budget constraints for voluntary activity');

    const getRes = await request(app.getHttpServer())
      .get(`/api/v1/proposals/${proposalId}`)
      .set('Cookie', adminCookie)
      .expect(200);

    expect(getRes.body.status).toBe('DECLINED');
    expect(getRes.body.declineReason).toBe('Budget constraints for voluntary activity');
  });

  it('POST /api/v1/proposals persists optional title and returns it in GET', async () => {
    const proposalRes = await request(app.getHttpServer())
      .post('/api/v1/proposals')
      .set('Cookie', studentCookie)
      .send({ title: 'School Garden Project', description: 'Planting herbs and flowers' })
      .expect(201);

    expect(proposalRes.body.title).toBe('School Garden Project');
    expect(proposalRes.body.description).toBe('Planting herbs and flowers');

    const getRes = await request(app.getHttpServer())
      .get(`/api/v1/proposals/${proposalRes.body.id}`)
      .set('Cookie', studentCookie)
      .expect(200);

    expect(getRes.body.title).toBe('School Garden Project');
  });
});
