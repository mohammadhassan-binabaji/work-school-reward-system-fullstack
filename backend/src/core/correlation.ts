import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { randomUUID } from 'node:crypto';
import { logger } from './logger.js';

declare module 'fastify' {
  interface FastifyRequest {
    correlationId: string;
  }
}

export function registerCorrelationHooks(app: FastifyInstance): void {
  app.addHook('onRequest', async (req: FastifyRequest, reply: FastifyReply) => {
    const correlationId = (req.headers['x-correlation-id'] as string) || randomUUID();
    req.correlationId = correlationId;
    reply.header('X-Correlation-ID', correlationId);

    logger.debug({
      correlationId,
      method: req.method,
      url: req.url,
      ip: req.ip
    }, 'Incoming HTTP request');
  });

  app.addHook('onResponse', async (req: FastifyRequest, reply: FastifyReply) => {
    const correlationId = req.correlationId;
    const statusCode = reply.statusCode;
    const responseTime = reply.elapsedTime;

    const logData = {
      correlationId,
      method: req.method,
      url: req.url,
      statusCode,
      responseTime: `${responseTime.toFixed(2)}ms`
    };

    if (statusCode >= 500) {
      logger.error(logData, 'HTTP request completed with server error');
    } else if (statusCode >= 400) {
      logger.warn(logData, 'HTTP request completed with client error');
    } else {
      logger.info(logData, 'HTTP request completed successfully');
    }
  });

  app.addHook('onError', async (req: FastifyRequest, _reply: FastifyReply, error: Error) => {
    logger.error({
      correlationId: req.correlationId,
      method: req.method,
      url: req.url,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    }, 'Unhandled error during request processing');
  });
}
