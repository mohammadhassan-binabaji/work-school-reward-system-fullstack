import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { prisma } from '../../src/core/prisma.js';
import { closeRedis } from '../../src/core/redis.js';
import { cleanDatabase } from '../test-helpers.js';

describe('Audit Immutability & Role-Based Scoping Tests (US9 - T054)', () => {
  let app: FastifyInstance;
  let adminSessionId: string;
  let teacher1Id: string;
  let teacher1SessionId: string;
  let teacher2Id: string;
  let teacher2SessionId: string;
  let student1Id: string;
  let student1SessionId: string;
  let student2Id: string;
  let student2SessionId: string;
  let class1Id: string;
  let class2Id: string;
  let subjectId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    await cleanDatabase();

    // 1. Provision admin
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/provision-admin',
      payload: {
        nationalId: '1000000001',
        username: 'admin_audit',
        password: 'Password123!',
        firstName: 'Admin',
        lastName: 'Audit'
      }
    });
    const adminLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { nationalId: '1000000001', password: 'Password123!' }
    });
    adminSessionId = JSON.parse(adminLogin.payload).sessionId;

    // 2. Classes & Subject
    const c1Res = await app.inject({
      method: 'POST',
      url: '/api/v1/academic/classes',
      headers: { authorization: `Bearer ${adminSessionId}` },
      payload: { name: 'Audit Class 1' }
    });
    class1Id = JSON.parse(c1Res.payload).id;

    const c2Res = await app.inject({
      method: 'POST',
      url: '/api/v1/academic/classes',
      headers: { authorization: `Bearer ${adminSessionId}` },
      payload: { name: 'Audit Class 2' }
    });
    class2Id = JSON.parse(c2Res.payload).id;

    const subRes = await app.inject({
      method: 'POST',
      url: '/api/v1/academic/subjects',
      headers: { authorization: `Bearer ${adminSessionId}` },
      payload: { name: 'Audit Subject' }
    });
    subjectId = JSON.parse(subRes.payload).id;

    // 3. Teachers
    const t1Res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/users',
      headers: { authorization: `Bearer ${adminSessionId}` },
      payload: {
        nationalId: '2000000001',
        username: 'teacher_audit1',
        password: 'Password123!',
        firstName: 'Teacher',
        lastName: 'One',
        role: 'TEACHER'
      }
    });
    teacher1Id = JSON.parse(t1Res.payload).id;
    const t1Login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { nationalId: '2000000001', password: 'Password123!' }
    });
    teacher1SessionId = JSON.parse(t1Login.payload).sessionId;

    const t2Res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/users',
      headers: { authorization: `Bearer ${adminSessionId}` },
      payload: {
        nationalId: '2000000002',
        username: 'teacher_audit2',
        password: 'Password123!',
        firstName: 'Teacher',
        lastName: 'Two',
        role: 'TEACHER'
      }
    });
    teacher2Id = JSON.parse(t2Res.payload).id;
    const t2Login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { nationalId: '2000000002', password: 'Password123!' }
    });
    teacher2SessionId = JSON.parse(t2Login.payload).sessionId;

    // Assign Teacher 1 to Class 1, Teacher 2 to Class 2
    await app.inject({
      method: 'POST',
      url: '/api/v1/academic/assignments',
      headers: { authorization: `Bearer ${adminSessionId}` },
      payload: { teacherId: teacher1Id, classId: class1Id, subjectId }
    });
    await app.inject({
      method: 'POST',
      url: '/api/v1/academic/assignments',
      headers: { authorization: `Bearer ${adminSessionId}` },
      payload: { teacherId: teacher2Id, classId: class2Id, subjectId }
    });

    // 4. Students
    const s1Res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/users',
      headers: { authorization: `Bearer ${adminSessionId}` },
      payload: {
        nationalId: '3000000001',
        username: 'student_audit1',
        password: 'Password123!',
        firstName: 'Student',
        lastName: 'One',
        role: 'STUDENT',
        classId: class1Id
      }
    });
    student1Id = JSON.parse(s1Res.payload).id;
    const s1Login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { nationalId: '3000000001', password: 'Password123!' }
    });
    student1SessionId = JSON.parse(s1Login.payload).sessionId;

    const s2Res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/users',
      headers: { authorization: `Bearer ${adminSessionId}` },
      payload: {
        nationalId: '3000000002',
        username: 'student_audit2',
        password: 'Password123!',
        firstName: 'Student',
        lastName: 'Two',
        role: 'STUDENT',
        classId: class2Id
      }
    });
    student2Id = JSON.parse(s2Res.payload).id;
    const s2Login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { nationalId: '3000000002', password: 'Password123!' }
    });
    student2SessionId = JSON.parse(s2Login.payload).sessionId;

    // 5. Transfer points to teachers
    await prisma.systemPointPool.upsert({
      where: { id: 'singleton' },
      update: { availableBalance: 10000, totalAllocated: 10000 },
      create: { id: 'singleton', availableBalance: 10000, totalAllocated: 10000 }
    });

    await app.inject({
      method: 'POST',
      url: '/api/v1/points/pool/transfer',
      headers: { authorization: `Bearer ${adminSessionId}` },
      payload: { teacherId: teacher1Id, pointAmount: 500 }
    });

    await app.inject({
      method: 'POST',
      url: '/api/v1/points/pool/transfer',
      headers: { authorization: `Bearer ${adminSessionId}` },
      payload: { teacherId: teacher2Id, pointAmount: 500 }
    });

    // 6. Create transfer tasks and award points
    const taskRes = await app.inject({
      method: 'POST',
      url: '/api/v1/points/tasks',
      headers: { authorization: `Bearer ${adminSessionId}` },
      payload: {
        name: 'Math Quiz Excellence',
        options: [10, 20, 30]
      }
    });
    const taskId = JSON.parse(taskRes.payload).id;

    // Teacher 1 awards Student 1
    await app.inject({
      method: 'POST',
      url: '/api/v1/points/award',
      headers: { authorization: `Bearer ${teacher1SessionId}` },
      payload: {
        studentId: student1Id,
        taskId,
        pointOption: 20
      }
    });

    // Teacher 2 awards Student 2
    await app.inject({
      method: 'POST',
      url: '/api/v1/points/award',
      headers: { authorization: `Bearer ${teacher2SessionId}` },
      payload: {
        studentId: student2Id,
        taskId,
        pointOption: 30
      }
    });
  });

  afterAll(async () => {
    await cleanDatabase();
    await app.close();
    await closeRedis();
  });

  it('preserves immutability: rejects attempts to update or delete audit records (no mutation routes)', async () => {
    const records = await prisma.auditRecord.findMany();
    expect(records.length).toBeGreaterThanOrEqual(4);
    const testRecordId = records[0].id;

    // Attempt PUT on audit record
    const putRes = await app.inject({
      method: 'PUT',
      url: `/api/v1/reports/point-flow/${testRecordId}`,
      headers: { authorization: `Bearer ${adminSessionId}` },
      payload: { pointAmount: 999999 }
    });
    expect(putRes.statusCode).toBe(404);

    // Attempt DELETE on audit record
    const delRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/reports/point-flow/${testRecordId}`,
      headers: { authorization: `Bearer ${adminSessionId}` }
    });
    expect(delRes.statusCode).toBe(404);
  });

  it('allows administrator to view school-wide audit records across all teachers and students', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/point-flow',
      headers: { authorization: `Bearer ${adminSessionId}` }
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.length).toBeGreaterThanOrEqual(4);

    const actionTypes = body.map((r: any) => r.actionType);
    expect(actionTypes).toContain('POOL_TRANSFER');
    expect(actionTypes).toContain('TEACHER_AWARD');
  });

  it('restricts teacher to only view students in assigned classes (Class 1 vs Class 2)', async () => {
    // Teacher 1 teaches Class 1 (Student 1). Should NOT see Student 2's award
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/point-flow',
      headers: { authorization: `Bearer ${teacher1SessionId}` }
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);

    // Should include Teacher 1's pool transfer and Teacher 1's award to Student 1
    const s2Records = body.filter((r: any) => r.recipientId === student2Id || r.sourceId === student2Id);
    expect(s2Records.length).toBe(0);

    const s1Records = body.filter((r: any) => r.recipientId === student1Id);
    expect(s1Records.length).toBeGreaterThanOrEqual(1);
  });

  it('restricts student to strictly their own point activity records', async () => {
    // Student 1 should only see records where they are recipient/source
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/point-flow',
      headers: { authorization: `Bearer ${student1SessionId}` }
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.length).toBeGreaterThanOrEqual(1);

    for (const record of body) {
      const isSelf =
        record.recipientId === student1Id ||
        record.sourceId === student1Id ||
        record.actorId === student1Id ||
        (record.resultingBalanceState && record.resultingBalanceState.studentId === student1Id);
      expect(isSelf).toBe(true);
    }

    // Student attempting to filter by another studentId still only sees their own
    const crossRes = await app.inject({
      method: 'GET',
      url: `/api/v1/reports/point-flow?studentId=${student2Id}`,
      headers: { authorization: `Bearer ${student1SessionId}` }
    });
    const crossBody = JSON.parse(crossRes.payload);
    expect(crossBody.length).toBe(0);
  });
});
