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

    const awardedStudentProfile = await prisma.studentProfile.findUniqueOrThrow({
      where: { id: aliceId },
    });
    const poolAfterAward = await prisma.systemPointPool.findFirstOrThrow();
    const awardAudit = await prisma.pointAuditLog.findFirstOrThrow({
      where: {
        actionType: 'CHALLENGE_AWARD_STUDENT',
        relatedEntityId: subRes.body.id,
      },
    });
    expect(awardedStudentProfile.currentBalance).toBe(30);
    expect(poolAfterAward.balance).toBe(9970);
    expect(awardAudit.sourceType).toBe('SYSTEM_POOL');
    expect(awardAudit.sourceId).toBe(poolAfterAward.id);
    expect(awardAudit.resultingSourceBalance).toBe(9970);

    // Second submission should be rejected (completion limit reached)
    await request(app.getHttpServer())
      .post(`/api/v1/activities/${missionId}/submissions`)
      .set('Cookie', aliceAuth.cookie)
      .send({ textDescription: 'Second attempt' })
      .expect(400);
  });

  it('does not enforce pending-request uniqueness in the submission API', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Cookie', adminCookie)
      .send({
        nationalId: '3333333334',
        firstName: 'Alice',
        lastName: 'Student',
        username: 'alice_pending',
        password: 'Password123!',
        role: 'STUDENT',
      })
      .expect(201);
    const aliceAuth = await loginUser(app, '3333333334', 'Password123!');
    const activity = await request(app.getHttpServer())
      .post('/api/v1/activities')
      .set('Cookie', adminCookie)
      .send({
        type: 'CHALLENGE',
        title: 'Client-only pending lock',
        description: 'The student UI disables repeat submissions',
        pointValue: 20,
        completionLimit: 2,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/activities/${activity.body.id}/submissions`)
      .set('Cookie', aliceAuth.cookie)
      .send({ textDescription: 'First request' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/activities/${activity.body.id}/submissions`)
      .set('Cookie', aliceAuth.cookie)
      .send({ textDescription: 'Second request through the API' })
      .expect(201);

    const listedActivities = await request(app.getHttpServer())
      .get('/api/v1/activities')
      .set('Cookie', aliceAuth.cookie)
      .expect(200);
    expect(
      listedActivities.body.find((item: { id: string }) => item.id === activity.body.id)
        .verificationStatus,
    ).toBe('PENDING');
  });

  it('leaves an activity verification pending when the admin pool is insufficient and allows retry', async () => {
    const student = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Cookie', adminCookie)
      .send({
        nationalId: '3333333335',
        firstName: 'Alice',
        lastName: 'Student',
        username: 'alice_insufficient',
        password: 'Password123!',
        role: 'STUDENT',
      })
      .expect(201);
    const aliceAuth = await loginUser(app, '3333333335', 'Password123!');
    const activity = await request(app.getHttpServer())
      .post('/api/v1/activities')
      .set('Cookie', adminCookie)
      .send({
        type: 'MISSION',
        title: 'Funded retry',
        description: 'Requires an available pool balance',
        pointValue: 30,
        completionLimit: 1,
      })
      .expect(201);
    const submission = await request(app.getHttpServer())
      .post(`/api/v1/activities/${activity.body.id}/submissions`)
      .set('Cookie', aliceAuth.cookie)
      .send({ textDescription: 'Completed the mission' })
      .expect(201);

    await prisma.systemPointPool.updateMany({ data: { balance: 0 } });
    await request(app.getHttpServer())
      .post(`/api/v1/verifications/${submission.body.id}/accept`)
      .set('Cookie', adminCookie)
      .expect(400);

    expect(
      (
        await prisma.verificationRequest.findUniqueOrThrow({
          where: { id: submission.body.id },
        })
      ).status,
    ).toBe('PENDING');
    expect(
      (await prisma.studentProfile.findUniqueOrThrow({ where: { id: student.body.id } }))
        .currentBalance,
    ).toBe(0);
    expect((await prisma.systemPointPool.findFirstOrThrow()).balance).toBe(0);
    expect(
      await prisma.pointAuditLog.count({ where: { actionType: 'CHALLENGE_AWARD_STUDENT' } }),
    ).toBe(0);

    await prisma.systemPointPool.updateMany({ data: { balance: 30 } });
    await request(app.getHttpServer())
      .post(`/api/v1/verifications/${submission.body.id}/accept`)
      .set('Cookie', adminCookie)
      .expect(200);

    expect(
      (await prisma.studentProfile.findUniqueOrThrow({ where: { id: student.body.id } }))
        .currentBalance,
    ).toBe(30);
    expect((await prisma.systemPointPool.findFirstOrThrow()).balance).toBe(0);
    expect(
      await prisma.pointAuditLog.count({ where: { actionType: 'CHALLENGE_AWARD_STUDENT' } }),
    ).toBe(1);
  });

  it('debits a vice principal balance when the vice principal accepts an activity verification', async () => {
    const student = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Cookie', adminCookie)
      .send({
        nationalId: '3333333336',
        firstName: 'Alice',
        lastName: 'Student',
        username: 'alice_vice_award',
        password: 'Password123!',
        role: 'STUDENT',
      })
      .expect(201);
    const aliceAuth = await loginUser(app, '3333333336', 'Password123!');
    const vicePrincipal = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Cookie', adminCookie)
      .send({
        nationalId: '4444444444',
        firstName: 'Vice',
        lastName: 'Principal',
        username: 'vice_activity',
        password: 'Password123!',
        role: 'VICE_PRINCIPAL',
      })
      .expect(201);
    const viceAuth = await loginUser(app, '4444444444', 'Password123!');
    await prisma.teacherProfile.update({
      where: { id: vicePrincipal.body.id },
      data: { pointBalance: 60 },
    });
    const activity = await request(app.getHttpServer())
      .post('/api/v1/activities')
      .set('Cookie', adminCookie)
      .send({
        type: 'CHALLENGE',
        title: 'Vice-funded activity',
        description: 'Awards are funded by the accepting vice principal',
        pointValue: 40,
        completionLimit: 1,
      })
      .expect(201);
    const submission = await request(app.getHttpServer())
      .post(`/api/v1/activities/${activity.body.id}/submissions`)
      .set('Cookie', aliceAuth.cookie)
      .send({ textDescription: 'Completed the challenge' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/verifications/${submission.body.id}/accept`)
      .set('Cookie', viceAuth.cookie)
      .expect(200);

    expect(
      (
        await prisma.teacherProfile.findUniqueOrThrow({
          where: { id: vicePrincipal.body.id },
        })
      ).pointBalance,
    ).toBe(20);
    expect(
      (await prisma.studentProfile.findUniqueOrThrow({ where: { id: student.body.id } }))
        .currentBalance,
    ).toBe(40);
    expect((await prisma.systemPointPool.findFirstOrThrow()).balance).toBe(10000);
    const awardAudit = await prisma.pointAuditLog.findFirstOrThrow({
      where: {
        actionType: 'CHALLENGE_AWARD_STUDENT',
        relatedEntityId: submission.body.id,
      },
    });
    expect(awardAudit.actorRole).toBe('VICE_PRINCIPAL');
    expect(awardAudit.sourceType).toBe('VICE_PRINCIPAL');
    expect(awardAudit.sourceId).toBe(vicePrincipal.body.id);
    expect(awardAudit.resultingSourceBalance).toBe(20);
  });

  it('awards an activity only once when two reviewers accept the same verification concurrently', async () => {
    const student = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Cookie', adminCookie)
      .send({
        nationalId: '3333333337',
        firstName: 'Alice',
        lastName: 'Student',
        username: 'alice_concurrent',
        password: 'Password123!',
        role: 'STUDENT',
      })
      .expect(201);
    const aliceAuth = await loginUser(app, '3333333337', 'Password123!');
    const activity = await request(app.getHttpServer())
      .post('/api/v1/activities')
      .set('Cookie', adminCookie)
      .send({
        type: 'MISSION',
        title: 'Single award',
        description: 'Concurrent reviews must not duplicate the payout',
        pointValue: 25,
        completionLimit: 1,
      })
      .expect(201);
    const submission = await request(app.getHttpServer())
      .post(`/api/v1/activities/${activity.body.id}/submissions`)
      .set('Cookie', aliceAuth.cookie)
      .send({ textDescription: 'Completed once' })
      .expect(201);

    const results = await Promise.all([
      request(app.getHttpServer())
        .post(`/api/v1/verifications/${submission.body.id}/accept`)
        .set('Cookie', adminCookie),
      request(app.getHttpServer())
        .post(`/api/v1/verifications/${submission.body.id}/accept`)
        .set('Cookie', adminCookie),
    ]);

    expect(results.map((result) => result.status).sort()).toEqual([200, 400]);
    expect(
      (await prisma.studentProfile.findUniqueOrThrow({ where: { id: student.body.id } }))
        .currentBalance,
    ).toBe(25);
    expect((await prisma.systemPointPool.findFirstOrThrow()).balance).toBe(9975);
    expect(
      await prisma.pointAuditLog.count({
        where: {
          actionType: 'CHALLENGE_AWARD_STUDENT',
          relatedEntityId: submission.body.id,
        },
      }),
    ).toBe(1);
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
