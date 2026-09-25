import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestingApp } from '../helpers/test-app.helper';
import { cleanDatabase, cleanRedis, seedBaselineTiers, seedSystemPool } from '../helpers/test-db.helper';
import { loginUser } from '../helpers/auth.helper';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { RedisService } from '../../src/common/redis/redis.service';

describe('Academic Lifecycle Integration Tests', () => {
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

  it('enforces that a student belongs to exactly one class (FR-008)', async () => {
    const classA = await request(app.getHttpServer())
      .post('/api/v1/classes')
      .set('Cookie', adminCookie)
      .send({ name: 'Class 7A' })
      .expect(201);

    const classB = await request(app.getHttpServer())
      .post('/api/v1/classes')
      .set('Cookie', adminCookie)
      .send({ name: 'Class 7B' })
      .expect(201);

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
        classId: classA.body.id,
      })
      .expect(201);

    let profile = await prisma.studentProfile.findUnique({ where: { id: student.body.id } });
    expect(profile?.classId).toBe(classA.body.id);

    // Reassign student to Class B
    await request(app.getHttpServer())
      .post('/api/v1/classes/assign-student')
      .set('Cookie', adminCookie)
      .send({
        studentId: student.body.id,
        classId: classB.body.id,
      })
      .expect(201);

    profile = await prisma.studentProfile.findUnique({ where: { id: student.body.id } });
    expect(profile?.classId).toBe(classB.body.id);
  });

  it('preserves student balance, active reward requests, and proposals on class transition (FR-009)', async () => {
    const classA = await request(app.getHttpServer())
      .post('/api/v1/classes')
      .set('Cookie', adminCookie)
      .send({ name: 'Class A' })
      .expect(201);

    const classB = await request(app.getHttpServer())
      .post('/api/v1/classes')
      .set('Cookie', adminCookie)
      .send({ name: 'Class B' })
      .expect(201);

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
        classId: classA.body.id,
      })
      .expect(201);
    const studentId = student.body.id;

    // Give Alice 100 points
    await request(app.getHttpServer())
      .post('/api/v1/points/admin-adjust')
      .set('Cookie', adminCookie)
      .send({ studentId, amount: 100, reason: 'Initial grant' })
      .expect(200);

    // Create a reward and request it (reserve 20 points)
    const reward = await request(app.getHttpServer())
      .post('/api/v1/rewards')
      .set('Cookie', adminCookie)
      .send({
        name: 'Book',
        description: 'Reading book',
        pointPrice: 20,
        requiresApproval: true,
      })
      .expect(201);

    const aliceAuth = await loginUser(app, '3333333333', 'Password123!');
    const reqRes = await request(app.getHttpServer())
      .post('/api/v1/reward-requests')
      .set('Cookie', aliceAuth.cookie)
      .send({ rewardId: reward.body.id })
      .expect(201);
    expect(reqRes.body.status).toBe('PENDING_TO_APPROVE');

    // Create a proposal
    const propRes = await request(app.getHttpServer())
      .post('/api/v1/proposals')
      .set('Cookie', aliceAuth.cookie)
      .send({ description: 'Class cleanup project' })
      .expect(201);
    expect(propRes.body.status).toBe('PENDING_TO_APPROVE');

    // Reassign Alice to Class B
    await request(app.getHttpServer())
      .post('/api/v1/classes/assign-student')
      .set('Cookie', adminCookie)
      .send({ studentId, classId: classB.body.id })
      .expect(201);

    // Verify Balances, Requests, Proposals preserved
    const profile = await prisma.studentProfile.findUnique({ where: { id: studentId } });
    expect(profile?.classId).toBe(classB.body.id);
    expect(profile?.currentBalance).toBe(80);
    expect(profile?.reservedBalance).toBe(20);

    const activeReq = await prisma.rewardRequest.findUnique({ where: { id: reqRes.body.id } });
    expect(activeReq?.status).toBe('PENDING_TO_APPROVE');

    const activeProp = await prisma.studentTaskProposal.findUnique({ where: { id: propRes.body.id } });
    expect(activeProp?.status).toBe('PENDING_TO_APPROVE');
  });

  it('handles student departure: clears balance, removes active reward requests, and marks departed (FR-010)', async () => {
    const classA = await request(app.getHttpServer())
      .post('/api/v1/classes')
      .set('Cookie', adminCookie)
      .send({ name: 'Class A' })
      .expect(201);

    const student = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Cookie', adminCookie)
      .send({
        nationalId: '3333333333',
        firstName: 'Alice',
        lastName: 'Departing',
        username: 'alice.dep',
        password: 'Password123!',
        role: 'STUDENT',
        classId: classA.body.id,
      })
      .expect(201);
    const studentId = student.body.id;

    await request(app.getHttpServer())
      .post('/api/v1/points/admin-adjust')
      .set('Cookie', adminCookie)
      .send({ studentId, amount: 50, reason: 'Initial points' })
      .expect(200);

    // Depart Student
    await request(app.getHttpServer())
      .post(`/api/v1/classes/students/${studentId}/depart`)
      .set('Cookie', adminCookie)
      .expect(201);

    const user = await prisma.user.findUnique({ where: { id: studentId } });
    expect(user?.accountState).toBe('DEPARTED');

    const profile = await prisma.studentProfile.findUnique({ where: { id: studentId } });
    expect(profile?.currentBalance).toBe(0);
    expect(profile?.reservedBalance).toBe(0);
  });

  it('handles teacher assignment deletion and teacher departure lifecycles (FR-013, FR-014)', async () => {
    const classA = await request(app.getHttpServer())
      .post('/api/v1/classes')
      .set('Cookie', adminCookie)
      .send({ name: 'Class 7A' })
      .expect(201);

    const subject = await request(app.getHttpServer())
      .post('/api/v1/subjects')
      .set('Cookie', adminCookie)
      .send({ name: 'Mathematics' })
      .expect(201);

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

    // Fund Teacher with 100 points
    await request(app.getHttpServer())
      .post('/api/v1/points/pool/fund-teacher')
      .set('Cookie', adminCookie)
      .send({ teacherId, amount: 100 })
      .expect(200);

    // Assign Teacher to Class A
    const assignRes = await request(app.getHttpServer())
      .post('/api/v1/assignments')
      .set('Cookie', adminCookie)
      .send({
        teacherId,
        classId: classA.body.id,
        subjectId: subject.body.id,
      })
      .expect(201);
    const assignmentId = assignRes.body.id;

    // Removing assignment preserves teacher balance (FR-013)
    await request(app.getHttpServer())
      .delete(`/api/v1/assignments/${assignmentId}`)
      .set('Cookie', adminCookie)
      .expect(204);

    let tProfile = await prisma.teacherProfile.findUnique({ where: { id: teacherId } });
    expect(tProfile?.pointBalance).toBe(100);

    // Teacher departure removes assignments and balance (FR-014)
    await request(app.getHttpServer())
      .post(`/api/v1/assignments/teachers/${teacherId}/depart`)
      .set('Cookie', adminCookie)
      .expect(201);

    const user = await prisma.user.findUnique({ where: { id: teacherId } });
    expect(user?.accountState).toBe('DEPARTED');

    tProfile = await prisma.teacherProfile.findUnique({ where: { id: teacherId } });
    expect(tProfile?.pointBalance).toBe(0);
  });
});

