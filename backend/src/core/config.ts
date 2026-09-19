import { Type, Static } from '@sinclair/typebox';

export const ConfigSchema = Type.Object({
  PORT: Type.Integer({ default: 3000 }),
  HOST: Type.String({ default: '0.0.0.0' }),
  NODE_ENV: Type.Union([
    Type.Literal('development'),
    Type.Literal('production'),
    Type.Literal('test')
  ], { default: 'development' }),
  DATABASE_URL: Type.String({ default: 'file:./dev.db' }),
  REDIS_URL: Type.String({ default: 'redis://localhost:6379' }),
  SESSION_SECRET: Type.String({ minLength: 32, default: 'super-secret-session-key-at-least-32-chars-long' }),
  SESSION_TTL_SECONDS: Type.Integer({ default: 7 * 24 * 60 * 60 }), // 7 days
  UPLOAD_DIR: Type.String({ default: './src/uploads' }),
  LOG_LEVEL: Type.Union([
    Type.Literal('fatal'),
    Type.Literal('error'),
    Type.Literal('warn'),
    Type.Literal('info'),
    Type.Literal('debug'),
    Type.Literal('trace')
  ], { default: 'info' })
});

export type Config = Static<typeof ConfigSchema>;

function loadConfig(): Config {
  const env = process.env;

  const port = env.PORT ? parseInt(env.PORT, 10) : 3000;
  const nodeEnv = (env.NODE_ENV as Config['NODE_ENV']) || 'development';
  const sessionTtl = env.SESSION_TTL_SECONDS ? parseInt(env.SESSION_TTL_SECONDS, 10) : 604800;

  return {
    PORT: Number.isNaN(port) ? 3000 : port,
    HOST: env.HOST || '0.0.0.0',
    NODE_ENV: nodeEnv,
    DATABASE_URL: env.DATABASE_URL || 'file:./dev.db',
    REDIS_URL: env.REDIS_URL || 'redis://localhost:6379',
    SESSION_SECRET: env.SESSION_SECRET || 'super-secret-session-key-at-least-32-chars-long',
    SESSION_TTL_SECONDS: Number.isNaN(sessionTtl) ? 604800 : sessionTtl,
    UPLOAD_DIR: env.UPLOAD_DIR || './src/uploads',
    LOG_LEVEL: (env.LOG_LEVEL as Config['LOG_LEVEL']) || (nodeEnv === 'test' ? 'error' : 'info')
  };
}

export const config = loadConfig();
