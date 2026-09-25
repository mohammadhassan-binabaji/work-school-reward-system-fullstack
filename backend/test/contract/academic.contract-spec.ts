import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestingApp } from '../helpers/test-app.helper';
import { cleanDatabase, cleanRedis, seedBaselineTiers, seedSystemPool } from '../helpers/test-db.helper';
import { loginUser } from '../helpers/auth.helper';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { RedisService } from '../../src/common/redis/redis.service';

describe('Academic Contract Tests (e2e)', () => {
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

  it('POST /api/v1/classes validates name requirement and rejects unknown fields', async () => {
    // Missing required name
    await request(app.getHttpServer())
      .post('/api/v1/classes')
      .set('Cookie', adminCookie)
      .send({})
      .expect(400);

    // Non-whitelisted field
    await request(app.getHttpServer())
      .post('/api/v1/classes')
      .set('Cookie', adminCookie)
      .send({
        name: 'Class 7A',
        extraField: 'not-allowed',
      })
      .expect(400);
  });

  it('POST /api/v1/classes/assign-student validates UUIDs', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/classes/assign-student')
      .set('Cookie', adminCookie)
      .send({
        studentId: 'not-a-uuid',
        classId: 'invalid-uuid',
      })
      .expect(400);
  });

  it('POST /api/v1/subjects validates name requirement', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/subjects')
      .set('Cookie', adminCookie)
      .send({})
      .expect(400);
  });

  it('POST /api/v1/assignments validates required UUID references', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/assignments')
      .set('Cookie', adminCookie)
      .send({
        teacherId: 'invalid',
        classId: 'invalid',
        subjectId: 'invalid',
      })
      .expect(400);
  });
});

