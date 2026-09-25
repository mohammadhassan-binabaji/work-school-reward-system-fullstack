import { registerAs } from '@nestjs/config';

export interface AppConfig {
  port: number;
  databaseUrl: string;
  redisUrl: string;
  storageProvider: 'local' | 'minio' | 's3';
  minioEndpoint: string;
  minioPort: number;
  minioUseSsl: boolean;
  minioAccessKey: string;
  minioSecretKey: string;
  minioBucket: string;
  sessionSecret: string;
  sessionTtlSeconds: number;
  activityBanDurationDays: number;
}

export const appConfig = registerAs('app', (): AppConfig => ({
  port: parseInt(process.env.PORT || '3000', 10),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgrespassword@localhost:5432/student_rewards?schema=public',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  storageProvider: (process.env.STORAGE_PROVIDER as 'local' | 'minio' | 's3') || 'local',
  minioEndpoint: process.env.MINIO_ENDPOINT || 'localhost',
  minioPort: parseInt(process.env.MINIO_PORT || '9000', 10),
  minioUseSsl: process.env.MINIO_USE_SSL === 'true',
  minioAccessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  minioSecretKey: process.env.MINIO_SECRET_KEY || 'minioadminpassword',
  minioBucket: process.env.MINIO_BUCKET || 'student-rewards',
  sessionSecret: process.env.SESSION_SECRET || 'default-insecure-session-secret-change-in-production',
  sessionTtlSeconds: parseInt(process.env.SESSION_TTL_SECONDS || '86400', 10),
  activityBanDurationDays: parseInt(process.env.ACTIVITY_BAN_DURATION_DAYS || '30', 10),
}));
