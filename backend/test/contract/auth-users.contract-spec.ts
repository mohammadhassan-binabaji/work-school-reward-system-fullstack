import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { RedisService } from '../../src/common/redis/redis.service';

describe('Auth & Users Contract Tests (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: RedisService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();

    prisma = app.get(PrismaService);
    redis = app.get(RedisService);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('POST /api/v1/auth/initial-admin schema contract', async () => {
    // Contract check for required fields
    const res = await request(app.getHttpServer()).post('/api/v1/auth/initial-admin').send({
      nationalId: 'invalid-id',
      firstName: 'Test',
      lastName: 'Admin',
      username: 'admin',
      password: 'Password123!',
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('statusCode', 400);
    expect(res.body).toHaveProperty('errorCode');
  });

  it('POST /api/v1/auth/login schema contract with invalid payload', async () => {
    const res = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
      nationalId: '123',
      password: 'short',
    });

    expect(res.status).toBe(400);
  });

  it('GET /api/v1/auth/me unauthorized contract', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('errorCode');
  });
});
