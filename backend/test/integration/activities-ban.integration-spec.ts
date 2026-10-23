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

describe('Activities Ban Integration Tests', () => {
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

  it('enforces activity completion limits per student (FR-037, FR-038, FR-040)', async () => {
    const student = await request(app.getHttpServer())
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
    const aliceId = student.body.id;
    const aliceAuth = await loginUser(app, '3333333333', 'Password123!');

    // Admin creates mission with limit = 1
    const missionRes = await request(app.getHttpServer())
      .post('/api/v1/activities')
      .set('Cookie', adminCookie)
      .send({
        type: 'MISSION',
        title: 'Library Helper',
        description: 'Organize bookshelves for 1 hour',
        pointValue: 30,
        completionLimit: 1,
      })
      .expect(201);
    const missionId = missionRes.body.id;

    // First submission
    const subRes = await request(app.getHttpServer())
      .post(`/api/v1/activities/${missionId}/submissions`)
      .set('Cookie', aliceAuth.cookie)
      .send({ textDescription: 'Organized science section' })
      .expect(201);

    // Admin accepts submission
    await request(app.getHttpServer())
      .post(`/api/v1/verifications/${subRes.body.id}/accept`)
      .set('Cookie', adminCookie)
      .expect(200);

    // Second submission should be rejected (completion limit reached)
    await request(app.getHttpServer())
      .post(`/api/v1/activities/${missionId}/submissions`)
      .set('Cookie', aliceAuth.cookie)
      .send({ textDescription: 'Second attempt' })
      .expect(400);
  });

  it('tracks rejection counters, bans after 3 rejections, and unbans cleanly (FR-041, FR-042, FR-043)', async () => {
    const student = await request(app.getHttpServer())
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
    const aliceId = student.body.id;
    const aliceAuth = await loginUser(app, '3333333333', 'Password123!');

    const challengeRes = await request(app.getHttpServer())
      .post('/api/v1/activities')
      .set('Cookie', adminCookie)
      .send({
        type: 'CHALLENGE',
        title: 'Coding Marathon',
        description: 'Solve 10 algorithm problems',
        pointValue: 40,
        completionLimit: 2,
      })
      .expect(201);
    const challengeId = challengeRes.body.id;

    // 3 Submissions and Rejections
    for (let i = 1; i <= 3; i++) {
      const sub = await request(app.getHttpServer())
        .post(`/api/v1/activities/${challengeId}/submissions`)
        .set('Cookie', aliceAuth.cookie)
        .send({ textDescription: `Attempt #${i}` })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/v1/verifications/${sub.body.id}/reject`)
        .set('Cookie', adminCookie)
        .send({ rejectionReason: `Failed test case #${i}` })
        .expect(200);
    }

    // 4th Submission attempt blocked (403 Forbidden)
    await request(app.getHttpServer())
      .post(`/api/v1/activities/${challengeId}/submissions`)
      .set('Cookie', aliceAuth.cookie)
      .send({ textDescription: 'Banned attempt' })
      .expect(403);

    // Admin unbans student
    await request(app.getHttpServer())
      .post(`/api/v1/students/${aliceId}/unban`)
      .set('Cookie', adminCookie)
      .send({ activityId: challengeId })
      .expect(200);

    // Submission succeeds after unban
    await request(app.getHttpServer())
      .post(`/api/v1/activities/${challengeId}/submissions`)
      .set('Cookie', aliceAuth.cookie)
      .send({ textDescription: 'Valid attempt after unban' })
      .expect(201);
  });
});
