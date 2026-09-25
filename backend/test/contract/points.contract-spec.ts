import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Points Contract Tests (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('POST /api/v1/points/pool/fund-teacher requires auth and role', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/points/pool/fund-teacher')
      .send({ teacherId: '00000000-0000-0000-0000-000000000000', amount: 50 });
    expect(res.status).toBe(401);
  });
});
