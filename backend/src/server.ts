import { buildApp } from './app.js';
import { config } from './core/config.js';
import { logger } from './core/logger.js';
import { prisma } from './core/prisma.js';
import { pingHealthCheck, closeRedis } from './core/redis.js';

async function start() {
  try {
    const app = await buildApp();

    // Verify DB & Redis connectivity
    await prisma.$connect();
    logger.info('Connected to SQLite Database');

    const redisHealthy = await pingHealthCheck();
    if (redisHealthy) {
      logger.info('Redis health check: PONG');
    } else {
      logger.warn('Redis health check returned false');
    }

    const address = await app.listen({
      port: config.PORT,
      host: config.HOST
    });
    logger.info(`Student Reward System Backend listening on ${address}`);
    logger.info(`OpenAPI Documentation available at ${address}/documentation`);

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, initiating graceful shutdown...`);
      try {
        await app.close();
        await prisma.$disconnect();
        await closeRedis();
        logger.info('Graceful shutdown completed successfully');
        process.exit(0);
      } catch (err) {
        logger.error({ err }, 'Error during graceful shutdown');
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    logger.fatal({ error }, 'Fatal error during server startup');
    process.exit(1);
  }
}

if (process.argv[1] && process.argv[1].includes('server')) {
  start();
}
