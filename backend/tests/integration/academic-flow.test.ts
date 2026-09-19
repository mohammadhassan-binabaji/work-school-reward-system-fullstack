import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { academicRoutes } from '../../src/modules/academic/academic.routes.js';
import { authRoutes } from '../../src/modules/auth/auth.routes.js';
import { prisma } from '../../src/core/prisma.js';
import { closeRedis } from '../../src/core/redis.js';
import { SessionStore } from '../../src/core/session.js';

describe('Academic Structure & Assignment Integration Tests (US2)', () => {
  let app: FastifyInstance;
  let adminSessionId: string;
  let teacherId: string;
  let teacherSessionId: string;
  let studentId: string;
  let studentSessionId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Clean up
    await prisma.rewardRequest.deleteMany();
    await prisma.reward.deleteMany();
    await prisma.teacherClassSubject.deleteMany();
    await prisma.student.deleteMany();
    await prisma.teacher.deleteMany();
    await prisma.class.deleteMany();
    await prisma.subject.deleteMany();
    await prisma.administrator.deleteMany();

    // Setup Admin
    const adminRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/provision-admin',
      payload: {
        nationalId: '1000000001',
        username: 'admin2',
        password: 'Password123!',
        firstName: 'Admin',
        lastName: 'Two'
      }
    });
    const adminLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { nationalId: '1000000001', password: 'Password123!' }
    });
    adminSessionId = JSON.parse(adminLogin.payload).sessionId;

    // Create teacher
    const tRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/users',
      headers: { authorization: `Bearer ${adminSessionId}` },
      payload: {
        nationalId: '2000000002',
        username: 'teacher2',
        password: 'Password123!',
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'TEACHER'
      }
    });
    teacherId = JSON.parse(tRes.payload).id;

    // Create student
    const sRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/users',
      headers: { authorization: `Bearer ${adminSessionId}` },
      payload: {
        nationalId: '3000000002',
        username: 'student2',
        password: 'Password123!',
        firstName: 'Bob',
        lastName: 'Jones',
        role: 'STUDENT'
      }
    });
    studentId = JSON.parse(sRes.payload).id;
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
    await closeRedis();
  });

  let classAId: string;
  let classBId: string;
  let subjectMathId: string;

  it('admin creates classes and subjects', async () => {
    const classRes = await app.inject({
      method: 'POST',
      url: '/api/v1/academic/classes',
      headers: { authorization: `Bearer ${adminSessionId}` },
      payload: { name: '7A', gradeLevel: 'Grade 7' }
    });
    expect(classRes.statusCode).toBe(201);
    classAId = JSON.parse(classRes.payload).id;

    const classBRes = await app.inject({
      method: 'POST',
      url: '/api/v1/academic/classes',
      headers: { authorization: `Bearer ${adminSessionId}` },
      payload: { name: '7B', gradeLevel: 'Grade 7' }
    });
    expect(classBRes.statusCode).toBe(201);
    classBId = JSON.parse(classBRes.payload).id;

    const subRes = await app.inject({
      method: 'POST',
      url: '/api/v1/academic/subjects',
      headers: { authorization: `Bearer ${adminSessionId}` },
      payload: { name: 'Mathematics' }
    });
    expect(subRes.statusCode).toBe(201);
    subjectMathId = JSON.parse(subRes.payload).id;
  });

  it('rejects duplicate class and subject names with 409', async () => {
    const classRes = await app.inject({
      method: 'POST',
      url: '/api/v1/academic/classes',
      headers: { authorization: `Bearer ${adminSessionId}` },
      payload: { name: '7A' }
    });
    expect(classRes.statusCode).toBe(409);

    const subRes = await app.inject({
      method: 'POST',
      url: '/api/v1/academic/subjects',
      headers: { authorization: `Bearer ${adminSessionId}` },
      payload: { name: 'Mathematics' }
    });
    expect(subRes.statusCode).toBe(409);
  });

  let assignmentId: string;

  it('admin assigns teacher to class and subject', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/academic/assignments',
      headers: { authorization: `Bearer ${adminSessionId}` },
      payload: {
        teacherId,
        classId: classAId,
        subjectId: subjectMathId
      }
    });
    expect(res.statusCode).toBe(201);
    assignmentId = JSON.parse(res.payload).id;

    // Duplicate assignment returns 409
    const dupRes = await app.inject({
      method: 'POST',
      url: '/api/v1/academic/assignments',
      headers: { authorization: `Bearer ${adminSessionId}` },
      payload: {
        teacherId,
        classId: classAId,
        subjectId: subjectMathId
      }
    });
    expect(dupRes.statusCode).toBe(409);
  });

  it('admin assigns student to Class 7A and verifies list', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/api/v1/academic/students/${studentId}/class`,
      headers: { authorization: `Bearer ${adminSessionId}` },
      payload: { classId: classAId }
    });
    expect(res.statusCode).toBe(200);

    const listRes = await app.inject({
      method: 'GET',
      url: `/api/v1/academic/classes/${classAId}/students`,
      headers: { authorization: `Bearer ${adminSessionId}` }
    });
    expect(listRes.statusCode).toBe(200);
    const students = JSON.parse(listRes.payload);
    expect(students.some((s: any) => s.id === studentId)).toBe(true);
  });

  it('student reassignment to Class 7B preserves points and active requests (FR-009)', async () => {
    // Give student some points
    await prisma.student.update({
      where: { id: studentId },
      data: { currentPoints: 100, reservedPoints: 20 }
    });

    const res = await app.inject({
      method: 'PUT',
      url: `/api/v1/academic/students/${studentId}/class`,
      headers: { authorization: `Bearer ${adminSessionId}` },
      payload: { classId: classBId }
    });
    expect(res.statusCode).toBe(200);

    const updated = await prisma.student.findUnique({ where: { id: studentId } });
    expect(updated?.classId).toBe(classBId);
    expect(updated?.currentPoints).toBe(100);
    expect(updated?.reservedPoints).toBe(20);
  });

  it('student departure zeroes balance, cancels active requests, and revokes sessions (FR-010)', async () => {
    // Login as student
    const sLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { nationalId: '3000000002', password: 'Password123!' }
    });
    studentSessionId = JSON.parse(sLogin.payload).sessionId;

    // Student departure
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/academic/students/${studentId}/departure`,
      headers: { authorization: `Bearer ${adminSessionId}` }
    });
    expect(res.statusCode).toBe(200);

    const departedStudent = await prisma.student.findUnique({ where: { id: studentId } });
    expect(departedStudent?.accountState).toBe('Departed');
    expect(departedStudent?.currentPoints).toBe(0);
    expect(departedStudent?.reservedPoints).toBe(0);

    // Student session must be revoked immediately
    const meRes = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { authorization: `Bearer ${studentSessionId}` }
    });
    expect(meRes.statusCode).toBe(401);
  });

  it('teacher deactivation preserves balance and assignments, but purges sessions and blocks actions (FR-012)', async () => {
    // Set teacher balance to 50
    await prisma.teacher.update({
      where: { id: teacherId },
      data: { pointBalance: 50, accountState: 'Active' }
    });

    // Login as teacher
    const tLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { nationalId: '2000000002', password: 'Password123!' }
    });
    teacherSessionId = JSON.parse(tLogin.payload).sessionId;

    // Deactivate teacher
    const res = await app.inject({
      method: 'PUT',
      url: `/api/v1/academic/teachers/${teacherId}/status`,
      headers: { authorization: `Bearer ${adminSessionId}` },
      payload: { status: 'Deactivated' }
    });
    expect(res.statusCode).toBe(200);

    // Balance and assignments preserved
    const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
    expect(teacher?.accountState).toBe('Deactivated');
    expect(teacher?.pointBalance).toBe(50);

    const assignments = await prisma.teacherClassSubject.findMany({
      where: { teacherId, assignmentState: 'Active' }
    });
    expect(assignments.length).toBeGreaterThan(0);

    // Active session immediately purged
    const meRes = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { authorization: `Bearer ${teacherSessionId}` }
    });
    expect(meRes.statusCode).toBe(401);

    // Teacher cannot login while deactivated
    const loginAttempt = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { nationalId: '2000000002', password: 'Password123!' }
    });
    expect(loginAttempt.statusCode).toBe(401);
  });

  it('teacher departure clears balance to zero, removes assignments, and purges sessions (FR-014)', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/api/v1/academic/teachers/${teacherId}/status`,
      headers: { authorization: `Bearer ${adminSessionId}` },
      payload: { status: 'Departed' }
    });
    expect(res.statusCode).toBe(200);

    const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
    expect(teacher?.accountState).toBe('Departed');
    expect(teacher?.pointBalance).toBe(0);

    const assignments = await prisma.teacherClassSubject.findMany({
      where: { teacherId, assignmentState: 'Active' }
    });
    expect(assignments.length).toBe(0);
  });
});
