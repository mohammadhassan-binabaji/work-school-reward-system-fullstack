import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { prisma } from '../../src/core/prisma.js';
import { closeRedis } from '../../src/core/redis.js';
import { cleanDatabase } from '../test-helpers.js';

describe('Reward Catalog Management & Redemption Integration Tests (US4)', () => {
  let app: FastifyInstance;
  let adminSessionId: string;
  let studentId: string;
  let studentSessionId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Clean up
    await cleanDatabase();

    // Admin setup
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/provision-admin',
      payload: {
        nationalId: '1000000001',
        username: 'admin4',
        password: 'Password123!',
        firstName: 'Admin',
        lastName: 'Four'
      }
    });
    const adminLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { nationalId: '1000000001', password: 'Password123!' }
    });
    adminSessionId = JSON.parse(adminLogin.payload).sessionId;

    // Student setup with 100 points
    const sRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/users',
      headers: { authorization: `Bearer ${adminSessionId}` },
      payload: {
        nationalId: '3000000001',
        username: 'studentRewards',
        password: 'Password123!',
        firstName: 'Sam',
        lastName: 'Student',
        role: 'STUDENT'
      }
    });
    studentId = JSON.parse(sRes.payload).id;

    await prisma.student.update({
      where: { id: studentId },
      data: { currentPoints: 100 }
    });

    const sLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { nationalId: '3000000001', password: 'Password123!' }
    });
    studentSessionId = JSON.parse(sLogin.payload).sessionId;
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
    await closeRedis();
  });

  let approvalRewardId: string;
  let inventoryRewardId: string;

  it('admin creates approval-required and inventory-backed rewards', async () => {
    // 1. Approval-required reward
    const res1 = await app.inject({
      method: 'POST',
      url: '/api/v1/rewards',
      headers: { authorization: `Bearer ${adminSessionId}` },
      payload: {
        name: 'Lunch with Principal',
        description: 'Special lunch voucher',
        pointPrice: 50,
        requiresApproval: true
      }
    });
    expect(res1.statusCode).toBe(201);
    approvalRewardId = JSON.parse(res1.payload).id;

    // 2. Inventory-backed reward
    const res2 = await app.inject({
      method: 'POST',
      url: '/api/v1/rewards',
      headers: { authorization: `Bearer ${adminSessionId}` },
      payload: {
        name: 'School Notebook',
        description: 'Hardcover spiral notebook',
        pointPrice: 30,
        requiresApproval: false,
        inventory: 2
      }
    });
    expect(res2.statusCode).toBe(201);
    inventoryRewardId = JSON.parse(res2.payload).id;
  });

  it('rejects attempt to alter reward price with 400 Bad Request (FR-025)', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/api/v1/rewards/${approvalRewardId}`,
      headers: { authorization: `Bearer ${adminSessionId}` },
      payload: {
        pointPrice: 40 // price modification attempt
      }
    });
    expect(res.statusCode).toBe(400);
  });

  let approvalRequestId: string;

  it('student requests approval-required reward, points reserved immediately into reservedPoints', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/rewards/requests',
      headers: { authorization: `Bearer ${studentSessionId}` },
      payload: { rewardId: approvalRewardId }
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    approvalRequestId = body.id;
    expect(body.status).toBe('Pending to Approve');
    expect(body.reservedPoints).toBe(50);

    const student = await prisma.student.findUnique({ where: { id: studentId } });
    expect(student?.currentPoints).toBe(50);
    expect(student?.reservedPoints).toBe(50);
  });

  it('admin declines request, reserved points atomically returned to currentPoints', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/rewards/requests/${approvalRequestId}/decline`,
      headers: { authorization: `Bearer ${adminSessionId}` }
    });
    expect(res.statusCode).toBe(200);

    const student = await prisma.student.findUnique({ where: { id: studentId } });
    expect(student?.currentPoints).toBe(100);
    expect(student?.reservedPoints).toBe(0);

    const reqRecord = await prisma.rewardRequest.findUnique({ where: { id: approvalRequestId } });
    expect(reqRecord?.status).toBe('Declined');
  });

  let secondRequestId: string;

  it('student re-requests, admin approves (transitions to Pending to Receive)', async () => {
    const reqRes = await app.inject({
      method: 'POST',
      url: '/api/v1/rewards/requests',
      headers: { authorization: `Bearer ${studentSessionId}` },
      payload: { rewardId: approvalRewardId }
    });
    secondRequestId = JSON.parse(reqRes.payload).id;

    const approveRes = await app.inject({
      method: 'POST',
      url: `/api/v1/rewards/requests/${secondRequestId}/approve`,
      headers: { authorization: `Bearer ${adminSessionId}` }
    });
    expect(approveRes.statusCode).toBe(200);

    const reqRecord = await prisma.rewardRequest.findUnique({ where: { id: secondRequestId } });
    expect(reqRecord?.status).toBe('Pending to Receive');

    // Reserved points still locked
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    expect(student?.currentPoints).toBe(50);
    expect(student?.reservedPoints).toBe(50);
  });

  it('admin confirms handover (/receive), status completes and reserved points finalized', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/rewards/requests/${secondRequestId}/receive`,
      headers: { authorization: `Bearer ${adminSessionId}` }
    });
    expect(res.statusCode).toBe(200);

    const reqRecord = await prisma.rewardRequest.findUnique({ where: { id: secondRequestId } });
    expect(reqRecord?.status).toBe('Completed');

    // Points permanently deducted
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    expect(student?.currentPoints).toBe(50);
    expect(student?.reservedPoints).toBe(0);
  });

  let inventoryRequestId: string;

  it('student requests inventory-backed reward (status starts at Pending to Receive, inventory decrements)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/rewards/requests',
      headers: { authorization: `Bearer ${studentSessionId}` },
      payload: { rewardId: inventoryRewardId }
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    inventoryRequestId = body.id;
    expect(body.status).toBe('Pending to Receive');

    const reward = await prisma.reward.findUnique({ where: { id: inventoryRewardId } });
    expect(reward?.inventory).toBe(1); // was 2

    const student = await prisma.student.findUnique({ where: { id: studentId } });
    expect(student?.currentPoints).toBe(20); // 50 - 30
    expect(student?.reservedPoints).toBe(30);
  });

  it('catalog removal of reward with active requests closes requests and returns reserved points (FR-026)', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/rewards/${inventoryRewardId}`,
      headers: { authorization: `Bearer ${adminSessionId}` }
    });
    expect(res.statusCode).toBe(200);

    const reward = await prisma.reward.findUnique({ where: { id: inventoryRewardId } });
    expect(reward?.status).toBe('Removed');

    const reqRecord = await prisma.rewardRequest.findUnique({ where: { id: inventoryRequestId } });
    expect(reqRecord?.status).toBe('Declined');

    // Reserved points returned to student
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    expect(student?.currentPoints).toBe(50); // 20 + 30
    expect(student?.reservedPoints).toBe(0);

    // Audit record created for removal return
    const audit = await prisma.auditRecord.findFirst({
      where: { actionType: 'REWARD_REMOVAL_RETURN', recipientId: studentId }
    });
    expect(audit).toBeDefined();
    expect(audit?.pointAmount).toBe(30);
  });
});
