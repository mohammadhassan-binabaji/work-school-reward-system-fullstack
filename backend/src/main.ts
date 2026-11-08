import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const allowedOrigins = configService.getOrThrow<string[]>('app.allowedOrigins');

  app.use(cookieParser());
  app.use((req, res, next) => {
    const origin = req.get('origin');
    const isSafeMethod = ['GET', 'HEAD', 'OPTIONS'].includes(req.method);
    const isCapacitorOrigin = origin === 'https://localhost';

    if (origin && !allowedOrigins.includes(origin)) {
      return res.status(403).json({
        statusCode: 403,
        errorCode: 'ORIGIN_NOT_ALLOWED',
        message: 'Request origin is not allowed',
      });
    }

    if (!isSafeMethod && req.cookies?.sessionId) {
      if (!origin || new URL(origin).host !== req.get('host')) {
        return res.status(403).json({
          statusCode: 403,
          errorCode: 'ORIGIN_NOT_ALLOWED',
          message: 'Cookie-authenticated requests must originate from this application',
        });
      }
    } else if (
      !isSafeMethod &&
      origin &&
      !isCapacitorOrigin &&
      new URL(origin).host !== req.get('host')
    ) {
      return res.status(403).json({
        statusCode: 403,
        errorCode: 'ORIGIN_NOT_ALLOWED',
        message: 'Browser requests must use the same-origin API proxy',
      });
    }

    next();
  });
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
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

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Student Reward System API')
    .setDescription('Modular Monolith Backend API for Student Reward System')
    .setVersion('1.0')
    .addCookieAuth('sessionId')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = configService.get<number>('app.port') || 3000;

  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger documentation available at: http://localhost:${port}/docs`);
}
bootstrap();
