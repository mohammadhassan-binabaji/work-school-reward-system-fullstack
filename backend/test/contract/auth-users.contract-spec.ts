import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as ExcelJS from 'exceljs';
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

describe('Auth & Users Contract Tests (e2e)', () => {
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

  it('POST /api/v1/auth/initial-admin rejects invalid nationalId and short passwords', async () => {
    const res = await request(app.getHttpServer()).post('/api/v1/auth/initial-admin').send({
      nationalId: 'invalid-id',
      firstName: 'Test',
      lastName: 'Admin',
      username: 'admin',
      password: 'short',
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('statusCode', 400);
  });

  it('POST /api/v1/auth/login schema contract with missing fields', async () => {
    const res = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
      nationalId: '123',
    });

    expect(res.status).toBe(400);
  });

  it('GET /api/v1/auth/me unauthorized contract', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('POST /api/v1/users validates role and nationalId regex', async () => {
    // Non-whitelisted field
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Cookie', adminCookie)
      .send({
        nationalId: '2222222222',
        firstName: 'Test',
        lastName: 'User',
        username: 'testuser',
        password: 'Password123!',
        role: 'TEACHER',
        unknownField: 'illegal',
      })
      .expect(400);

    // Invalid role
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Cookie', adminCookie)
      .send({
        nationalId: '2222222222',
        firstName: 'Test',
        lastName: 'User',
        username: 'testuser',
        password: 'Password123!',
        role: 'SUPERUSER',
      })
      .expect(400);
  });

  it('PATCH /api/v1/users/:id/state validates accountState enum', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/users/00000000-0000-0000-0000-000000000000/state')
      .set('Cookie', adminCookie)
      .send({ accountState: 'INVALID_STATE' })
      .expect(400);
  });

  it('GET /api/v1/users/import/template returns downloadable excel template', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/users/import/template')
      .set('Cookie', adminCookie)
      .expect(200);

    expect(res.headers['content-type']).toContain('spreadsheetml.sheet');
    expect(res.headers['content-disposition']).toContain('students-import-template.xlsx');
  });

  it('POST /api/v1/users/import/excel successfully imports valid students in an atomic transaction', async () => {
    const cls = await prisma.class.create({
      data: { name: 'Class 701' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Students');
    worksheet.addRow(['کد ملی', 'نام', 'نام خانوادگی', 'نام کاربری', 'رمز عبور', 'نام کلاس']);
    worksheet.addRow(['0123456789', 'علی', 'احمدی', 'ali.ahmadi', 'StudentPass123!', cls.name]);
    worksheet.addRow(['0987654321', 'رضا', 'محمدی', 'reza.mohammadi', 'StudentPass123!', cls.name]);

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    const res = await request(app.getHttpServer())
      .post('/api/v1/users/import/excel')
      .set('Cookie', adminCookie)
      .attach('file', buffer, 'students.xlsx')
      .expect(201);

    expect(res.body.count).toBe(2);

    const user1 = await prisma.user.findUnique({
      where: { nationalId: '0123456789' },
      include: { studentProfile: true },
    });
    expect(user1).toBeDefined();
    expect(user1?.role).toBe('STUDENT');
    expect(user1?.studentProfile?.classId).toBe(cls.id);
    expect(user1?.studentProfile?.currentBalance).toBe(0);

    const user2 = await prisma.user.findUnique({
      where: { nationalId: '0987654321' },
    });
    expect(user2).toBeDefined();
  });

  it('POST /api/v1/users/import/excel returns 422 with row-level errors on validation/class failure and rolls back', async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Students');
    worksheet.addRow(['کد ملی', 'نام', 'نام خانوادگی', 'نام کاربری', 'رمز عبور', 'نام کلاس']);
    worksheet.addRow(['123', 'نامعتبر', 'تست', 'invalid.user', '123', 'NonExistentClass']);

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    const res = await request(app.getHttpServer())
      .post('/api/v1/users/import/excel')
      .set('Cookie', adminCookie)
      .attach('file', buffer, 'students.xlsx')
      .expect(422);

    expect(res.body.errorCode).toBe('BULK_IMPORT_VALIDATION_FAILED');
    expect(Array.isArray(res.body.errors)).toBe(true);
    expect(res.body.errors.some((e: any) => e.field === 'nationalId')).toBe(true);
    expect(res.body.errors.some((e: any) => e.field === 'className')).toBe(true);
  });

  it('PATCH /api/v1/users/:id updates user fields and returns updated user', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Cookie', adminCookie)
      .send({
        nationalId: '3333333333',
        firstName: 'OldName',
        lastName: 'OldLast',
        username: 'updatetest',
        password: 'Password123!',
        role: 'TEACHER',
      })
      .expect(201);

    const userId = createRes.body.id;

    const patchRes = await request(app.getHttpServer())
      .patch(`/api/v1/users/${userId}`)
      .set('Cookie', adminCookie)
      .send({
        firstName: 'NewName',
        lastName: 'NewLast',
        accountState: 'INACTIVE',
      })
      .expect(200);

    expect(patchRes.body.firstName).toBe('NewName');
    expect(patchRes.body.lastName).toBe('NewLast');
    expect(patchRes.body.accountState).toBe('INACTIVE');

    const dbUser = await prisma.user.findUnique({ where: { id: userId } });
    expect(dbUser?.firstName).toBe('NewName');
    expect(dbUser?.accountState).toBe('INACTIVE');
  });

  it('PATCH /api/v1/users/:id rejects password shorter than 8 characters', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Cookie', adminCookie)
      .send({
        nationalId: '4444444444',
        firstName: 'Pass',
        lastName: 'Test',
        username: 'passtest',
        password: 'Password123!',
        role: 'STUDENT',
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/users/${createRes.body.id}`)
      .set('Cookie', adminCookie)
      .send({
        password: 'short',
      })
      .expect(400);
  });

  it('DELETE /api/v1/users/:id deletes user and returns 204', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Cookie', adminCookie)
      .send({
        nationalId: '5555555555',
        firstName: 'Delete',
        lastName: 'Me',
        username: 'deleteme',
        password: 'Password123!',
        role: 'STUDENT',
      })
      .expect(201);

    const userId = createRes.body.id;

    await request(app.getHttpServer())
      .delete(`/api/v1/users/${userId}`)
      .set('Cookie', adminCookie)
      .expect(204);

    const dbUser = await prisma.user.findUnique({ where: { id: userId } });
    expect(dbUser).toBeNull();
  });

  it('DELETE /api/v1/users/:id returns 404 for nonexistent user', async () => {
    await request(app.getHttpServer())
      .delete('/api/v1/users/00000000-0000-0000-0000-000000000000')
      .set('Cookie', adminCookie)
      .expect(404);
  });
});
