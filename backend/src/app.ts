import fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { config } from './core/config.js';
import { registerCorrelationHooks } from './core/correlation.js';
import { ApplicationError } from './core/errors.js';
import { logger } from './core/logger.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = fastify({
    logger: false
  });

  // 1. Core plugins
  await app.register(cookie, {
    secret: config.SESSION_SECRET,
    hook: 'onRequest'
  });

  await app.register(cors, {
    origin: true,
    credentials: true
  });

  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB per FR-039
      files: 5
    }
  });

  // 2. Swagger / OpenAPI documentation
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Student Reward System Backend API',
        description: 'Production REST API for Student Reward System Backend',
        version: '1.0.0'
      },
      servers: [
        {
          url: '/api/v1',
          description: 'API Gateway v1'
        }
      ]
    }
  });

  await app.register(swaggerUi, {
    routePrefix: '/documentation',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false
    }
  });

  // 3. Correlation ID & structured lifecycle hooks
  registerCorrelationHooks(app);

  // 4. Register Module Routes
  const { authRoutes } = await import('./modules/auth/auth.routes.js');
  await app.register(authRoutes, { prefix: '/api/v1/auth' });

  const { academicRoutes } = await import('./modules/academic/academic.routes.js');
  await app.register(academicRoutes, { prefix: '/api/v1/academic' });

  const { pointsRoutes } = await import('./modules/points/points.routes.js');
  await app.register(pointsRoutes, { prefix: '/api/v1/points' });

  const { rewardsRoutes } = await import('./modules/rewards/rewards.routes.js');
  await app.register(rewardsRoutes, { prefix: '/api/v1/rewards' });

  const { activitiesRoutes } = await import('./modules/activities/activities.routes.js');
  await app.register(activitiesRoutes, { prefix: '/api/v1/activities' });

  const { proposalsRoutes } = await import('./modules/proposals/proposals.routes.js');
  await app.register(proposalsRoutes, { prefix: '/api/v1/proposals' });

  const { analyticsRoutes } = await import('./modules/analytics/analytics.routes.js');
  await app.register(analyticsRoutes, { prefix: '/api/v1/analytics' });

  const { guidanceRoutes } = await import('./modules/guidance/guidance.routes.js');
  await app.register(guidanceRoutes, { prefix: '/api/v1/guidance' });

  const { reportingRoutes } = await import('./modules/reporting/reporting.routes.js');
  await app.register(reportingRoutes, { prefix: '/api/v1/reports' });

  // 5. Standardized 404 Handler
  app.setNotFoundHandler((req: FastifyRequest, reply: FastifyReply) => {
    reply.status(404).send({
      statusCode: 404,
      error: 'Not Found',
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.url} not found`,
      correlationId: req.correlationId,
      timestamp: new Date().toISOString()
    });
  });

  // 5. Standardized Error Handler per Constitution Principle VII
  app.setErrorHandler((error, req: FastifyRequest, reply: FastifyReply) => {
    if (error instanceof ApplicationError) {
      return reply.status(error.statusCode).send(error.toResponse(req.correlationId));
    }

    if (error.validation) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        code: 'VALIDATION_ERROR',
        message: error.message,
        details: error.validation,
        correlationId: req.correlationId,
        timestamp: new Date().toISOString()
      });
    }

    const statusCode = typeof error.statusCode === 'number' && error.statusCode >= 400 ? error.statusCode : 500;

    logger.error(
      {
        err: error,
        correlationId: req.correlationId,
        url: req.url,
        method: req.method
      },
      'Internal Server Error caught by top-level handler'
    );

    return reply.status(statusCode).send({
      statusCode,
      error: statusCode === 500 ? 'Internal Server Error' : error.name || 'Error',
      code: 'INTERNAL_SERVER_ERROR',
      message: statusCode === 500 ? 'An unexpected internal error occurred' : error.message,
      correlationId: req.correlationId,
      timestamp: new Date().toISOString()
    });
  });

  return app;
}
