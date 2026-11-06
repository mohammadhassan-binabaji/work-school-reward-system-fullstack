import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from '../../src/app.module';
import { GlobalExceptionFilter } from '../../src/common/filters/global-exception.filter';
import { LoggingInterceptor } from '../../src/common/interceptors/logging.interceptor';
import { RedisService } from '../../src/common/redis/redis.service';

export async function createTestingApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.use(cookieParser());
  const redis = app.get(RedisService);
  app.use((req, _res, next) => {
    const sessionId = req.cookies?.sessionId;
    if (!sessionId || req.headers['x-csrf-token']) {
      next();
      return;
    }

    void redis
      .getSession(sessionId)
      .then((session) => {
        if (session) {
          req.headers['x-csrf-token'] = session.csrfToken;
        }
        next();
      })
      .catch(next);
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  await app.init();
  return app;
}
