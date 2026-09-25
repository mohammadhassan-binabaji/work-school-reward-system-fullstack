import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestingApp } from '../helpers/test-app.helper';
import { cleanDatabase, cleanRedis, seedBaselineTiers, seedSystemPool } from '../helpers/test-db.helper';
import { loginUser } from '../helpers/auth.helper';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { RedisService } from '../../src/common/redis/redis.service';

describe('Proposals & Messaging Integration Tests', () => {
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

  it('handles proposal lifecycle: submit -> approve -> adjust points -> complete (FR-044, FR-045, FR-046, FR-048)', async () => {
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

    // 1. Submit
    const propRes = await request(app.getHttpServer())
      .post('/api/v1/proposals')
      .set('Cookie', aliceAuth.cookie)
      .send({ description: 'Organize school recycling bins' })
      .expect(201);
    const proposalId = propRes.body.id;
    expect(propRes.body.status).toBe('PENDING_TO_APPROVE');

    // 2. Approve with 20 points
    const approveRes = await request(app.getHttpServer())
      .post(`/api/v1/proposals/${proposalId}/approve`)
      .set('Cookie', adminCookie)
      .send({ assignedPointValue: 20 })
      .expect(200);
    expect(approveRes.body.status).toBe('READY_TO_DO');
    expect(approveRes.body.assignedPointValue).toBe(20);

    // 3. Admin adjusts point value to 35
    const adjustRes = await request(app.getHttpServer())
      .patch(`/api/v1/proposals/${proposalId}/points`)
      .set('Cookie', adminCookie)
      .send({ assignedPointValue: 35 })
      .expect(200);
    expect(adjustRes.body.assignedPointValue).toBe(35);

    // 4. Admin marks completed
    const compRes = await request(app.getHttpServer())
      .post(`/api/v1/proposals/${proposalId}/complete`)
      .set('Cookie', adminCookie)
      .expect(200);
    expect(compRes.body.status).toBe('COMPLETED');

    // Verify Points added
    const profile = await prisma.studentProfile.findUnique({ where: { id: aliceId } });
    expect(profile?.currentBalance).toBe(35);
  });

  it('allows student cancellation ONLY while in READY_TO_DO status (FR-047)', async () => {
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
    const aliceAuth = await loginUser(app, '3333333333', 'Password123!');

    const propRes = await request(app.getHttpServer())
      .post('/api/v1/proposals')
      .set('Cookie', aliceAuth.cookie)
      .send({ description: 'Campus mural painting' })
      .expect(201);
    const proposalId = propRes.body.id;

    // Student cannot cancel while PENDING_TO_APPROVE
    await request(app.getHttpServer())
      .post(`/api/v1/proposals/${proposalId}/cancel`)
      .set('Cookie', aliceAuth.cookie)
      .expect(400);

    // Admin approves proposal
    await request(app.getHttpServer())
      .post(`/api/v1/proposals/${proposalId}/approve`)
      .set('Cookie', adminCookie)
      .send({ assignedPointValue: 15 })
      .expect(200);

    // Student cancels proposal while READY_TO_DO
    const cancelRes = await request(app.getHttpServer())
      .post(`/api/v1/proposals/${proposalId}/cancel`)
      .set('Cookie', aliceAuth.cookie)
      .expect(200);
    expect(cancelRes.body.status).toBe('CANCELED');
  });

  it('strictly isolates student proposals from other students and teachers (FR-051, FR-053)', async () => {
    // Setup Teacher
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Cookie', adminCookie)
      .send({
        nationalId: '2222222222',
        firstName: 'Teacher',
        lastName: 'One',
        username: 'teacher1',
        password: 'Password123!',
        role: 'TEACHER',
      })
      .expect(201);
    const teacherAuth = await loginUser(app, '2222222222', 'Password123!');

    // Setup Student 1 (Alice)
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Cookie', adminCookie)
      .send({
        nationalId: '3333333333',
        firstName: 'Alice',
        lastName: 'A',
        username: 'alice',
        password: 'Password123!',
        role: 'STUDENT',
      })
      .expect(201);
    const aliceAuth = await loginUser(app, '3333333333', 'Password123!');

    // Setup Student 2 (Bob)
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Cookie', adminCookie)
      .send({
        nationalId: '4444444444',
        firstName: 'Bob',
        lastName: 'B',
        username: 'bob',
        password: 'Password123!',
        role: 'STUDENT',
      })
      .expect(201);
    const bobAuth = await loginUser(app, '4444444444', 'Password123!');

    // Alice creates proposal
    const propRes = await request(app.getHttpServer())
      .post('/api/v1/proposals')
      .set('Cookie', aliceAuth.cookie)
      .send({ description: 'Alice private proposal' })
      .expect(201);
    const proposalId = propRes.body.id;

    // Teacher cannot view proposal
    await request(app.getHttpServer())
      .get(`/api/v1/proposals/${proposalId}`)
      .set('Cookie', teacherAuth.cookie)
      .expect(403);

    // Bob cannot view Alice proposal
    await request(app.getHttpServer())
      .get(`/api/v1/proposals/${proposalId}`)
      .set('Cookie', bobAuth.cookie)
      .expect(403);

    // Bob list proposals should not return Alice proposal
    const bobList = await request(app.getHttpServer())
      .get('/api/v1/proposals')
      .set('Cookie', bobAuth.cookie)
      .expect(200);

    expect(bobList.body.some((p: any) => p.id === proposalId)).toBe(false);
  });
});

