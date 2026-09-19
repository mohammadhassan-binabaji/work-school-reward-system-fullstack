import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { prisma } from '../../src/core/prisma.js';
import { closeRedis } from '../../src/core/redis.js';

describe('Point Allocation & Atomic Award Integration Tests (US3)', () => {
  let app: FastifyInstance;
  let adminSessionId: string;
  let teacherId: string;
  let teacherSessionId: string;
  let otherTeacherId: string;
  let otherTeacherSessionId: string;
  let studentId: string;
  let classId: string;
  let subjectId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Clean up
    await prisma.auditRecord.deleteMany();
    await prisma.pointTransferTaskOption.deleteMany();
    await prisma.pointTransferTask.deleteMany();
    await prisma.teacherClassSubject.deleteMany();
    await prisma.student.deleteMany();
    await prisma.teacher.deleteMany();
    await prisma.class.deleteMany();
    await prisma.subject.deleteMany();
    await prisma.administrator.deleteMany();
    await prisma.systemPointPool.deleteMany();

    // Recreate pool and default tiers
    await prisma.systemPointPool.create({
      data: { totalAllocated: 10000, availableBalance: 10000 }
    });

    const defaultTiers = [
      { tierIndex: 1, tierName: 'Bronze', minPoints: 0, displayColor: '#CD7F32' },
      { tierIndex: 2, tierName: 'Silver', minPoints: 100, displayColor: '#C0C0C0' },
      { tierIndex: 3, tierName: 'Gold', minPoints: 300, displayColor: '#FFD700' },
      { tierIndex: 4, tierName: 'Platinum', minPoints: 600, displayColor: '#E5E4E2' },
      { tierIndex: 5, tierName: 'Diamond', minPoints: 1000, displayColor: '#B9F2FF' }
    ];
    for (const t of defaultTiers) {
      await prisma.studentTier.upsert({
        where: { tierIndex: t.tierIndex },
        update: {},
        create: t
      });
    }

    // Provision admin
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/provision-admin',
      payload: {
        nationalId: '1000000001',
        username: 'admin3',
        password: 'Password123!',
        firstName: 'Admin',
        lastName: 'Three'
      }
    });
    const adminLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { nationalId: '1000000001', password: 'Password123!' }
    });
    adminSessionId = JSON.parse(adminLogin.payload).sessionId;

    // Create Class & Subject
    const cRes = await app.inject({
      method: 'POST',
      url: '/api/v1/academic/classes',
      headers: { authorization: `Bearer ${adminSessionId}` },
      payload: { name: 'Class 8A' }
    });
    classId = JSON.parse(cRes.payload).id;

    const subRes = await app.inject({
      method: 'POST',
      url: '/api/v1/academic/subjects',
      headers: { authorization: `Bearer ${adminSessionId}` },
      payload: { name: 'English' }
    });
    subjectId = JSON.parse(subRes.payload).id;

    // Create Teacher 1 (assigned to Class 8A)
    const tRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/users',
      headers: { authorization: `Bearer ${adminSessionId}` },
      payload: {
        nationalId: '2000000001',
        username: 'assignedTeacher',
        password: 'Password123!',
        firstName: 'Assigned',
        lastName: 'Teacher',
        role: 'TEACHER'
      }
    });
    teacherId = JSON.parse(tRes.payload).id;

    const tLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { nationalId: '2000000001', password: 'Password123!' }
    });
    teacherSessionId = JSON.parse(tLogin.payload).sessionId;

    // Assign Teacher 1 to Class 8A
    await app.inject({
      method: 'POST',
      url: '/api/v1/academic/assignments',
      headers: { authorization: `Bearer ${adminSessionId}` },
      payload: { teacherId, classId, subjectId }
    });

    // Create Teacher 2 (unassigned)
    const otRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/users',
      headers: { authorization: `Bearer ${adminSessionId}` },
      payload: {
        nationalId: '2000000002',
        username: 'unassignedTeacher',
        password: 'Password123!',
        firstName: 'Unassigned',
        lastName: 'Teacher',
        role: 'TEACHER'
      }
    });
    otherTeacherId = JSON.parse(otRes.payload).id;

    const otLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { nationalId: '2000000002', password: 'Password123!' }
    });
    otherTeacherSessionId = JSON.parse(otLogin.payload).sessionId;

    // Create Student in Class 8A
    const sRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/users',
      headers: { authorization: `Bearer ${adminSessionId}` },
      payload: {
        nationalId: '3000000001',
        username: 'studentPoints',
        password: 'Password123!',
        firstName: 'Point',
        lastName: 'Student',
        role: 'STUDENT',
        classId
      }
    });
    studentId = JSON.parse(sRes.payload).id;
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
    await closeRedis();
  });

  it('admin transfers points from pool to teacher budget', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/points/pool/transfer',
      headers: { authorization: `Bearer ${adminSessionId}` },
      payload: {
        teacherId,
        pointAmount: 500
      }
    });
    expect(res.statusCode).toBe(200);

    const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
    expect(teacher?.pointBalance).toBe(500);

    const pool = await prisma.systemPointPool.findFirst();
    expect(pool?.availableBalance).toBe(9500);

    // Verify audit record created
    const audit = await prisma.auditRecord.findFirst({
      where: { actionType: 'POOL_TRANSFER', recipientId: teacherId }
    });
    expect(audit).toBeDefined();
    expect(audit?.pointAmount).toBe(500);
  });

  it('rejects pool transfer exceeding available balance', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/points/pool/transfer',
      headers: { authorization: `Bearer ${adminSessionId}` },
      payload: {
        teacherId,
        pointAmount: 999999
      }
    });
    expect(res.statusCode).toBe(400);
  });

  let taskId: string;

  it('admin creates point transfer task with positive options', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/points/tasks',
      headers: { authorization: `Bearer ${adminSessionId}` },
      payload: {
        name: 'Doing Homework',
        description: 'Complete homework on time',
        options: [5, 10, 15]
      }
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    taskId = body.id;
    expect(body.options.length).toBe(3);
  });

  it('assigned teacher awards points to student', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/points/award',
      headers: { authorization: `Bearer ${teacherSessionId}` },
      payload: {
        studentId,
        taskId,
        pointOption: 15
      }
    });
    expect(res.statusCode).toBe(200);

    const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
    expect(teacher?.pointBalance).toBe(485); // 500 - 15

    const student = await prisma.student.findUnique({ where: { id: studentId } });
    expect(student?.currentPoints).toBe(15);
    expect(student?.highestBalance).toBe(15);

    // Verify audit record
    const audit = await prisma.auditRecord.findFirst({
      where: { actionType: 'TEACHER_AWARD', recipientId: studentId }
    });
    expect(audit).toBeDefined();
    expect(audit?.pointAmount).toBe(15);
  });

  it('rejects unassigned teacher attempting to award points (403 Forbidden)', async () => {
    // Fund unassigned teacher first
    await prisma.teacher.update({
      where: { id: otherTeacherId },
      data: { pointBalance: 100 }
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/points/award',
      headers: { authorization: `Bearer ${otherTeacherSessionId}` },
      payload: {
        studentId,
        taskId,
        pointOption: 10
      }
    });
    expect(res.statusCode).toBe(403);
  });

  it('rejects award when teacher has insufficient balance', async () => {
    // Reduce teacher balance to 5
    await prisma.teacher.update({
      where: { id: teacherId },
      data: { pointBalance: 5 }
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/points/award',
      headers: { authorization: `Bearer ${teacherSessionId}` },
      payload: {
        studentId,
        taskId,
        pointOption: 15
      }
    });
    expect(res.statusCode).toBe(400);
  });

  it('admin directly adjusts student points and prevents negative balance', async () => {
    // Student currently has 15 points. Add 50 points.
    const addRes = await app.inject({
      method: 'POST',
      url: '/api/v1/points/adjust',
      headers: { authorization: `Bearer ${adminSessionId}` },
      payload: {
        targetType: 'STUDENT',
        targetId: studentId,
        pointAdjustment: 50,
        reason: 'Special contest prize'
      }
    });
    expect(addRes.statusCode).toBe(200);

    const student = await prisma.student.findUnique({ where: { id: studentId } });
    expect(student?.currentPoints).toBe(65);
    expect(student?.highestBalance).toBe(65);

    // Try deducting 100 points (would be negative -35) -> must reject with 400
    const negRes = await app.inject({
      method: 'POST',
      url: '/api/v1/points/adjust',
      headers: { authorization: `Bearer ${adminSessionId}` },
      payload: {
        targetType: 'STUDENT',
        targetId: studentId,
        pointAdjustment: -100,
        reason: 'Invalid deduction'
      }
    });
    expect(negRes.statusCode).toBe(400);

    // Balance remains 65
    const studentAfter = await prisma.student.findUnique({ where: { id: studentId } });
    expect(studentAfter?.currentPoints).toBe(65);
  });
});
