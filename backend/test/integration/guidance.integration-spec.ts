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

describe('Guidance Cards Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: RedisService;
  let adminCookie: string;
  let studentCookie: string;

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

    await request(app.getHttpServer())
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

    const studentAuth = await loginUser(app, '3333333333', 'Password123!');
    studentCookie = studentAuth.cookie;
  });

  it('allows admin to create, read, update, and delete guidance categories and cards (FR-064)', async () => {
    // 1. Create Category
    const catRes = await request(app.getHttpServer())
      .post('/api/v1/guidance-categories')
      .set('Cookie', adminCookie)
      .send({
        title: 'Sports & Athletics',
        iconKey: 'trophy',
        sortOrder: 1,
      })
      .expect(201);

    const categoryId = catRes.body.id;
    expect(catRes.body.title).toBe('Sports & Athletics');

    // 2. Create Guidance Card under category
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/guidance-cards')
      .set('Cookie', adminCookie)
      .send({
        categoryId,
        title: 'Join School Sports Team',
        description: 'Participate in after-school athletics to earn points',
        logoKey: 'sports_soccer',
        pointRangeLabel: '15 to 30 points',
        sortOrder: 1,
      })
      .expect(201);

    const cardId = createRes.body.id;
    expect(createRes.body.title).toBe('Join School Sports Team');
    expect(createRes.body.categoryId).toBe(categoryId);

    // 3. Update Guidance Card
    const updateRes = await request(app.getHttpServer())
      .patch(`/api/v1/guidance-cards/${cardId}`)
      .set('Cookie', adminCookie)
      .send({
        title: 'Join Varsity Sports',
        pointRangeLabel: '20 to 40 points',
      })
      .expect(200);

    expect(updateRes.body.title).toBe('Join Varsity Sports');
    expect(updateRes.body.pointRangeLabel).toBe('20 to 40 points');

    // 4. Update Category
    const updateCatRes = await request(app.getHttpServer())
      .patch(`/api/v1/guidance-categories/${categoryId}`)
      .set('Cookie', adminCookie)
      .send({
        title: 'Athletics & Competitions',
      })
      .expect(200);

    expect(updateCatRes.body.title).toBe('Athletics & Competitions');

    // 5. Delete Guidance Card
    await request(app.getHttpServer())
      .delete(`/api/v1/guidance-cards/${cardId}`)
      .set('Cookie', adminCookie)
      .expect(200);

    const check = await prisma.guidanceCard.findUnique({ where: { id: cardId } });
    expect(check?.status).toBe('REMOVED');

    // 6. Delete Category
    await request(app.getHttpServer())
      .delete(`/api/v1/guidance-categories/${categoryId}`)
      .set('Cookie', adminCookie)
      .expect(200);

    const checkCat = await prisma.guidanceCategory.findUnique({ where: { id: categoryId } });
    expect(checkCat?.status).toBe('REMOVED');
  });

  it('enforces student read-only access and rejects student mutations (FR-065)', async () => {
    // Admin creates category and card
    const catRes = await request(app.getHttpServer())
      .post('/api/v1/guidance-categories')
      .set('Cookie', adminCookie)
      .send({
        title: 'Academic Activities',
        iconKey: 'graduation-cap',
      })
      .expect(201);
    const categoryId = catRes.body.id;

    const createRes = await request(app.getHttpServer())
      .post('/api/v1/guidance-cards')
      .set('Cookie', adminCookie)
      .send({
        categoryId,
        title: 'Reading Challenge',
        description: 'Read 3 books per term',
        logoKey: 'book_icon',
        pointRangeLabel: '10 to 20 points',
      })
      .expect(201);
    const cardId = createRes.body.id;

    // Student can list guidance categories with their cards
    const catListRes = await request(app.getHttpServer())
      .get('/api/v1/guidance-categories')
      .set('Cookie', studentCookie)
      .expect(200);

    expect(catListRes.body.some((c: any) => c.id === categoryId)).toBe(true);

    // Student can list guidance cards
    const listRes = await request(app.getHttpServer())
      .get('/api/v1/guidance-cards')
      .set('Cookie', studentCookie)
      .expect(200);

    expect(listRes.body.some((c: any) => c.id === cardId)).toBe(true);

    // Student cannot create guidance category
    await request(app.getHttpServer())
      .post('/api/v1/guidance-categories')
      .set('Cookie', studentCookie)
      .send({
        title: 'Illegal Student Category',
      })
      .expect(403);

    // Student cannot create guidance card
    await request(app.getHttpServer())
      .post('/api/v1/guidance-cards')
      .set('Cookie', studentCookie)
      .send({
        categoryId,
        title: 'Illegal Student Card',
        description: 'Desc',
        logoKey: 'logo',
        pointRangeLabel: '100 points',
      })
      .expect(403);

    // Student cannot edit guidance card
    await request(app.getHttpServer())
      .patch(`/api/v1/guidance-cards/${cardId}`)
      .set('Cookie', studentCookie)
      .send({ title: 'Hacked Title' })
      .expect(403);

    // Student cannot delete guidance card
    await request(app.getHttpServer())
      .delete(`/api/v1/guidance-cards/${cardId}`)
      .set('Cookie', studentCookie)
      .expect(403);
  });
});
