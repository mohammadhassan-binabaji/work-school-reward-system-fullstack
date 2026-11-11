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

describe('Academic Contract Tests (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: RedisService;
  let adminCookie: string;
  let vicePrincipalCookie: string;

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

  it('POST /api/v1/classes validates name requirement and rejects unknown fields', async () => {
    // Missing required name
    await request(app.getHttpServer())
      .post('/api/v1/classes')
      .set('Cookie', adminCookie)
      .send({})
      .expect(400);

    // Non-whitelisted field
    await request(app.getHttpServer())
      .post('/api/v1/classes')
      .set('Cookie', adminCookie)
      .send({
        name: 'Class 7A',
        extraField: 'not-allowed',
      })
      .expect(400);
  });

  it('POST /api/v1/classes/assign-student validates UUIDs', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/classes/assign-student')
      .set('Cookie', adminCookie)
      .send({
        studentId: 'not-a-uuid',
        classId: 'invalid-uuid',
      })
      .expect(400);
  });

  it('POST /api/v1/subjects validates name requirement', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/subjects')
      .set('Cookie', adminCookie)
      .send({})
      .expect(400);
  });

  it('POST /api/v1/assignments validates required UUID references', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/assignments')
      .set('Cookie', adminCookie)
      .send({
        teacherId: 'invalid',
        classId: 'invalid',
        subjectId: 'invalid',
      })
      .expect(400);
  });

  it('vice principals can manage academic data without departure access or full teacher details', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Cookie', adminCookie)
      .send({
        nationalId: '6666666666',
        firstName: 'Vice',
        lastName: 'Principal',
        username: 'viceprincipal',
        password: 'Password123!',
        role: 'VICE_PRINCIPAL',
      })
      .expect(201);
    vicePrincipalCookie = (await loginUser(app, '6666666666', 'Password123!')).cookie;

    const teacher = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Cookie', adminCookie)
      .send({
        nationalId: '7777777777',
        firstName: 'Teacher',
        lastName: 'Reference',
        username: 'teacherreference',
        password: 'Password123!',
        role: 'TEACHER',
      })
      .expect(201);
    const student = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Cookie', adminCookie)
      .send({
        nationalId: '8888888888',
        firstName: 'Academic',
        lastName: 'Student',
        username: 'academicstudent',
        password: 'Password123!',
        role: 'STUDENT',
      })
      .expect(201);

    const classResponse = await request(app.getHttpServer())
      .post('/api/v1/classes')
      .set('Cookie', vicePrincipalCookie)
      .send({ name: 'Vice Principal Class' })
      .expect(201);
    const subjectResponse = await request(app.getHttpServer())
      .post('/api/v1/subjects')
      .set('Cookie', vicePrincipalCookie)
      .send({ name: 'Vice Principal Subject' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/assignments')
      .set('Cookie', vicePrincipalCookie)
      .send({
        teacherId: teacher.body.id,
        classId: classResponse.body.id,
        subjectId: subjectResponse.body.id,
      })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/classes/assign-student')
      .set('Cookie', vicePrincipalCookie)
      .send({ studentId: student.body.id, classId: classResponse.body.id })
      .expect(201);

    const teacherReferences = await request(app.getHttpServer())
      .get('/api/v1/users/academic/teachers')
      .set('Cookie', vicePrincipalCookie)
      .expect(200);
    expect(teacherReferences.body).toEqual([
      { id: teacher.body.id, firstName: 'Teacher', lastName: 'Reference' },
    ]);

    const assignmentList = await request(app.getHttpServer())
      .get('/api/v1/assignments')
      .set('Cookie', vicePrincipalCookie)
      .expect(200);
    expect(assignmentList.body[0].teacher).toEqual({
      id: teacher.body.id,
      firstName: 'Teacher',
      lastName: 'Reference',
    });

    const classDetails = await request(app.getHttpServer())
      .get(`/api/v1/classes/${classResponse.body.id}`)
      .set('Cookie', vicePrincipalCookie)
      .expect(200);
    expect(classDetails.body.teacherAssignments[0].teacher).toEqual({
      id: teacher.body.id,
      firstName: 'Teacher',
      lastName: 'Reference',
    });

    await request(app.getHttpServer())
      .post(`/api/v1/classes/students/${student.body.id}/depart`)
      .set('Cookie', vicePrincipalCookie)
      .expect(403);
    await request(app.getHttpServer())
      .post(`/api/v1/assignments/teachers/${teacher.body.id}/depart`)
      .set('Cookie', vicePrincipalCookie)
      .expect(403);
  });
});
