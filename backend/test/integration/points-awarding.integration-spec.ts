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

describe('Points Awarding Integration Tests', () => {
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
    await seedSystemPool(prisma, 1000);

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

  it('manages system pool balance and rejects overdraw funding (FR-015, FR-016)', async () => {
    const teacher = await request(app.getHttpServer())
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
    const teacherId = teacher.body.id;

    // Admin sets pool balance to 500
    await request(app.getHttpServer())
      .post('/api/v1/points/pool/balance')
      .set('Cookie', adminCookie)
      .send({ balance: 500 })
      .expect(201);

    // Fund teacher with 200 points
    const fundRes = await request(app.getHttpServer())
      .post('/api/v1/points/pool/fund-teacher')
      .set('Cookie', adminCookie)
      .send({ teacherId, amount: 200 })
      .expect(200);

    expect(fundRes.body.teacherNewBalance).toBe(200);
    expect(fundRes.body.poolRemainingBalance).toBe(300);

    // Overdrawing the pool should fail (attempt 400 when only 300 left)
    await request(app.getHttpServer())
      .post('/api/v1/points/pool/fund-teacher')
      .set('Cookie', adminCookie)
      .send({ teacherId, amount: 400 })
      .expect(400);
  });

  it('allows admin direct point adjustments and prevents negative student balances (FR-023)', async () => {
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

    // Add 50 points
    const addRes = await request(app.getHttpServer())
      .post('/api/v1/points/admin-adjust')
      .set('Cookie', adminCookie)
      .send({ studentId, amount: 50, reason: 'Good behavior' })
      .expect(200);

    expect(addRes.body.newCurrentBalance).toBe(50);
    expect(addRes.body.newHighestBalance).toBe(50);

    // Subtract 20 points
    const subRes = await request(app.getHttpServer())
      .post('/api/v1/points/admin-adjust')
      .set('Cookie', adminCookie)
      .send({ studentId, amount: -20, reason: 'Behavioral penalty' })
      .expect(200);

    expect(subRes.body.newCurrentBalance).toBe(30);
    expect(subRes.body.newHighestBalance).toBe(50); // Highest balance does not decrease

    // Attempting to subtract 40 points when only 30 points remain should fail (prevent negative balance)
    await request(app.getHttpServer())
      .post('/api/v1/points/admin-adjust')
      .set('Cookie', adminCookie)
      .send({ studentId, amount: -40, reason: 'Excessive deduction' })
      .expect(400);
  });

  it('manages task creation, option selection, and task deactivation (FR-017, FR-018)', async () => {
    // Admin creates task
    const taskRes = await request(app.getHttpServer())
      .post('/api/v1/points/tasks')
      .set('Cookie', adminCookie)
      .send({
        name: 'Math Challenge Winner',
        description: 'Placed 1st, 2nd, or 3rd in Math Olympiad',
        options: [
          { points: 30, label: '1st Place' },
          { points: 20, label: '2nd Place' },
          { points: 10, label: '3rd Place' },
        ],
      })
      .expect(201);

    const taskId = taskRes.body.id;
    expect(taskRes.body.options.length).toBe(3);

    // List tasks
    const listRes = await request(app.getHttpServer())
      .get('/api/v1/points/tasks')
      .set('Cookie', adminCookie)
      .expect(200);

    expect(listRes.body.some((t: any) => t.id === taskId)).toBe(true);

    // Deactivate task
    await request(app.getHttpServer())
      .patch(`/api/v1/points/tasks/${taskId}`)
      .set('Cookie', adminCookie)
      .send({ isActive: false })
      .expect(200);

    const updated = await prisma.pointTransferTask.findUnique({ where: { id: taskId } });
    expect(updated?.isActive).toBe(false);
  });

  it('allows teacher to award points with custom reason and amount (FR-018, FR-020, FR-021)', async () => {
    // Create teacher
    const teacherRes = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Cookie', adminCookie)
      .send({
        nationalId: '2222222222',
        firstName: 'Sarah',
        lastName: 'Teacher',
        username: 'teacher_sarah',
        password: 'Password123!',
        role: 'TEACHER',
      })
      .expect(201);
    const teacherId = teacherRes.body.id;

    // Fund teacher with 100 points
    await request(app.getHttpServer())
      .post('/api/v1/points/pool/fund-teacher')
      .set('Cookie', adminCookie)
      .send({ teacherId, amount: 100 })
      .expect(200);

    // Create Class & Subject & Assignment
    const classRes = await request(app.getHttpServer())
      .post('/api/v1/classes')
      .set('Cookie', adminCookie)
      .send({ name: 'Class 8A', gradeLevel: 'Grade 8' })
      .expect(201);
    const classId = classRes.body.id;

    const subjectRes = await request(app.getHttpServer())
      .post('/api/v1/subjects')
      .set('Cookie', adminCookie)
      .send({ name: 'Mathematics' })
      .expect(201);
    const subjectId = subjectRes.body.id;

    await request(app.getHttpServer())
      .post('/api/v1/assignments')
      .set('Cookie', adminCookie)
      .send({ teacherId, classId, subjectId })
      .expect(201);

    // Create Student Alice in Class 8A
    const studentRes = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Cookie', adminCookie)
      .send({
        nationalId: '4444444444',
        firstName: 'Alice',
        lastName: 'Student',
        username: 'alice_student',
        password: 'Password123!',
        role: 'STUDENT',
        classId,
      })
      .expect(201);
    const studentId = studentRes.body.id;

    // Teacher logs in
    const teacherAuth = await loginUser(app, '2222222222', 'Password123!');

    // Teacher awards 25 points with custom reason & description
    const awardRes = await request(app.getHttpServer())
      .post('/api/v1/points/teacher-award')
      .set('Cookie', teacherAuth.cookie)
      .send({
        studentId,
        classId,
        subjectId,
        amount: 25,
        reason: 'حل مسائل سخت ریاضی',
        description: 'تمرین صفحه ۵۰ کتاب درسی',
      })
      .expect(200);

    expect(awardRes.body.awardedPoints).toBe(25);
    expect(awardRes.body.studentNewBalance).toBe(25);
    expect(awardRes.body.teacherRemainingBudget).toBe(75);

    // Verify Audit Log
    const auditLogs = await prisma.pointAuditLog.findMany({
      where: { recipientId: studentId },
    });
    expect(auditLogs.length).toBe(1);
    expect(auditLogs[0].amount).toBe(25);
    expect(auditLogs[0].reasonDetail).toBe('حل مسائل سخت ریاضی');
    const meta = auditLogs[0].metadata as any;
    expect(meta.description).toBe('تمرین صفحه ۵۰ کتاب درسی');
    expect(meta.teacherName).toContain('Sarah');

    // Attempt to overspend remaining teacher budget (75 remains, try 80)
    await request(app.getHttpServer())
      .post('/api/v1/points/teacher-award')
      .set('Cookie', teacherAuth.cookie)
      .send({
        studentId,
        classId,
        subjectId,
        amount: 80,
        reason: 'Too many points',
      })
      .expect(400);
  });
});
