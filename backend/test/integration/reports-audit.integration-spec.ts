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

describe('Reports & Audit Integration Tests', () => {
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

  it('enforces role-scoped point flow reporting: admin vs teacher vs student (FR-070)', async () => {
    // 1. Create Class 7A and Class 7B
    const c7A = await request(app.getHttpServer())
      .post('/api/v1/classes')
      .set('Cookie', adminCookie)
      .send({ name: 'Class 7A' })
      .expect(201);

    const c7B = await request(app.getHttpServer())
      .post('/api/v1/classes')
      .set('Cookie', adminCookie)
      .send({ name: 'Class 7B' })
      .expect(201);

    // 2. Create Teacher assigned to Class 7A
    const teacher = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Cookie', adminCookie)
      .send({
        nationalId: '2222222222',
        firstName: 'Teacher',
        lastName: 'Math',
        username: 'teacher.math',
        password: 'Password123!',
        role: 'TEACHER',
      })
      .expect(201);
    const teacherAuth = await loginUser(app, '2222222222', 'Password123!');

    const mathSub = await request(app.getHttpServer())
      .post('/api/v1/subjects')
      .set('Cookie', adminCookie)
      .send({ name: 'Mathematics' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/assignments')
      .set('Cookie', adminCookie)
      .send({
        teacherId: teacher.body.id,
        classId: c7A.body.id,
        subjectId: mathSub.body.id,
      })
      .expect(201);

    // 3. Create Student Alice in Class 7A and Student Bob in Class 7B
    const alice = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Cookie', adminCookie)
      .send({
        nationalId: '3000000001',
        firstName: 'Alice',
        lastName: 'A',
        username: 'alice',
        password: 'Password123!',
        role: 'STUDENT',
        classId: c7A.body.id,
      })
      .expect(201);
    const aliceAuth = await loginUser(app, '3000000001', 'Password123!');

    const bob = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Cookie', adminCookie)
      .send({
        nationalId: '3000000002',
        firstName: 'Bob',
        lastName: 'B',
        username: 'bob',
        password: 'Password123!',
        role: 'STUDENT',
        classId: c7B.body.id,
      })
      .expect(201);
    const bobAuth = await loginUser(app, '3000000002', 'Password123!');

    // 4. Create point activities for Alice and Bob
    await request(app.getHttpServer())
      .post('/api/v1/points/admin-adjust')
      .set('Cookie', adminCookie)
      .send({ studentId: alice.body.id, amount: 25, reason: 'Alice points' })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/v1/points/admin-adjust')
      .set('Cookie', adminCookie)
      .send({ studentId: bob.body.id, amount: 40, reason: 'Bob points' })
      .expect(200);

    // 5. Admin queries report -> sees all entries
    const adminReport = await request(app.getHttpServer())
      .get('/api/v1/reports/point-flow')
      .set('Cookie', adminCookie)
      .expect(200);

    expect(adminReport.body.data.length).toBeGreaterThanOrEqual(2);

    // 6. Alice queries report -> only sees Alice points
    const aliceReport = await request(app.getHttpServer())
      .get('/api/v1/reports/point-flow')
      .set('Cookie', aliceAuth.cookie)
      .expect(200);

    expect(
      aliceReport.body.data.every(
        (r: any) => r.recipientId === alice.body.id || r.sourceId === alice.body.id,
      ),
    ).toBe(true);

    // 7. Teacher queries report -> only sees assigned class students (Alice)
    const teacherReport = await request(app.getHttpServer())
      .get('/api/v1/reports/point-flow')
      .set('Cookie', teacherAuth.cookie)
      .expect(200);

    expect(teacherReport.body.data.some((r: any) => r.recipientId === bob.body.id)).toBe(false);
  });

  it('streams report exports in CSV, Excel, and PDF formats with proper headers (FR-071)', async () => {
    // Generate some audit data
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

    await request(app.getHttpServer())
      .post('/api/v1/points/admin-adjust')
      .set('Cookie', adminCookie)
      .send({ studentId: student.body.id, amount: 100, reason: 'Export validation entry' })
      .expect(200);

    // CSV Export
    const csvRes = await request(app.getHttpServer())
      .get('/api/v1/reports/point-flow/export?format=csv')
      .set('Cookie', adminCookie)
      .expect(200);

    expect(csvRes.headers['content-type']).toContain('text/csv');
    expect(csvRes.text).toContain('Export validation entry');

    // XLSX Export
    const xlsxRes = await request(app.getHttpServer())
      .get('/api/v1/reports/point-flow/export?format=xlsx')
      .set('Cookie', adminCookie)
      .expect(200);

    expect(xlsxRes.body).toBeDefined();

    // PDF Export
    const pdfRes = await request(app.getHttpServer())
      .get('/api/v1/reports/point-flow/export?format=pdf')
      .set('Cookie', adminCookie)
      .expect(200);

    expect(pdfRes.headers['content-type']).toContain('application/pdf');
  });
});
