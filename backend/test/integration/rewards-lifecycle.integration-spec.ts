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

describe('Rewards Lifecycle Integration Tests', () => {
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

  it('manages approval-required reward lifecycle: request -> approve -> receive (FR-027, FR-031, FR-032, FR-033)', async () => {
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
    const studentId = student.body.id;

    // Grant 100 points
    await request(app.getHttpServer())
      .post('/api/v1/points/admin-adjust')
      .set('Cookie', adminCookie)
      .send({ studentId, amount: 100, reason: 'Grant' })
      .expect(200);

    // Create approval-required reward
    const reward = await request(app.getHttpServer())
      .post('/api/v1/rewards')
      .set('Cookie', adminCookie)
      .send({
        name: 'School Hoodie',
        description: 'Warm hoodie with logo',
        pointPrice: 60,
        requiresApproval: true,
      })
      .expect(201);
    const rewardId = reward.body.id;

    // Student requests reward
    const aliceAuth = await loginUser(app, '3333333333', 'Password123!');
    const reqRes = await request(app.getHttpServer())
      .post('/api/v1/reward-requests')
      .set('Cookie', aliceAuth.cookie)
      .send({ rewardId })
      .expect(201);

    expect(reqRes.body.status).toBe('PENDING_TO_APPROVE');
    expect(reqRes.body.reservedAmount).toBe(60);
    const requestId = reqRes.body.id;

    // Verify Balances
    let profile = await prisma.studentProfile.findUnique({ where: { id: studentId } });
    expect(profile?.currentBalance).toBe(40);
    expect(profile?.reservedBalance).toBe(60);

    // Admin Approves Request
    const approveRes = await request(app.getHttpServer())
      .post(`/api/v1/reward-requests/${requestId}/approve`)
      .set('Cookie', adminCookie)
      .expect(200);

    expect(approveRes.body.status).toBe('PENDING_TO_RECEIVE');

    // Admin Marks Received (Physical handover)
    const receiveRes = await request(app.getHttpServer())
      .post(`/api/v1/reward-requests/${requestId}/receive`)
      .set('Cookie', adminCookie)
      .expect(200);

    expect(receiveRes.body.status).toBe('COMPLETED');

    // Verify Final Balance
    profile = await prisma.studentProfile.findUnique({ where: { id: studentId } });
    expect(profile?.currentBalance).toBe(40);
    expect(profile?.reservedBalance).toBe(0);
  });

  it('refunds reserved points when admin declines reward request (FR-032)', async () => {
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
    const studentId = student.body.id;

    await request(app.getHttpServer())
      .post('/api/v1/points/admin-adjust')
      .set('Cookie', adminCookie)
      .send({ studentId, amount: 50, reason: 'Grant' })
      .expect(200);

    const reward = await request(app.getHttpServer())
      .post('/api/v1/rewards')
      .set('Cookie', adminCookie)
      .send({
        name: 'Board Game',
        description: 'Chess set',
        pointPrice: 50,
        requiresApproval: true,
      })
      .expect(201);

    const aliceAuth = await loginUser(app, '3333333333', 'Password123!');
    const reqRes = await request(app.getHttpServer())
      .post('/api/v1/reward-requests')
      .set('Cookie', aliceAuth.cookie)
      .send({ rewardId: reward.body.id })
      .expect(201);
    const requestId = reqRes.body.id;

    // Admin Declines Request
    const declineRes = await request(app.getHttpServer())
      .post(`/api/v1/reward-requests/${requestId}/decline`)
      .set('Cookie', adminCookie)
      .send({ declineReason: 'Out of stock from supplier' })
      .expect(200);

    expect(declineRes.body.status).toBe('DECLINED');

    // Verify Points returned to student balance
    const profile = await prisma.studentProfile.findUnique({ where: { id: studentId } });
    expect(profile?.currentBalance).toBe(50);
    expect(profile?.reservedBalance).toBe(0);
  });

  it('automatically closes active requests and refunds points when reward is deleted (FR-034)', async () => {
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
    const studentId = student.body.id;

    await request(app.getHttpServer())
      .post('/api/v1/points/admin-adjust')
      .set('Cookie', adminCookie)
      .send({ studentId, amount: 80, reason: 'Grant' })
      .expect(200);

    const reward = await request(app.getHttpServer())
      .post('/api/v1/rewards')
      .set('Cookie', adminCookie)
      .send({
        name: 'Discontinued Item',
        description: 'Old item',
        pointPrice: 40,
        requiresApproval: true,
      })
      .expect(201);
    const rewardId = reward.body.id;

    const aliceAuth = await loginUser(app, '3333333333', 'Password123!');
    const reqRes = await request(app.getHttpServer())
      .post('/api/v1/reward-requests')
      .set('Cookie', aliceAuth.cookie)
      .send({ rewardId })
      .expect(201);

    // Admin Deletes Reward Catalog Item
    await request(app.getHttpServer())
      .delete(`/api/v1/rewards/${rewardId}`)
      .set('Cookie', adminCookie)
      .expect(200);

    // Verify Request closed and reserved points refunded
    const updatedReq = await prisma.rewardRequest.findUnique({ where: { id: reqRes.body.id } });
    expect(updatedReq?.status).toBe('DECLINED');

    const profile = await prisma.studentProfile.findUnique({ where: { id: studentId } });
    expect(profile?.currentBalance).toBe(80);
    expect(profile?.reservedBalance).toBe(0);
  });
});
