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
  firebaseProjectId: string;
  allowedOrigins: string[];
  activityBanDurationDays: number;
}

function getAllowedOrigins(): string[] {
  const webOrigins = process.env.WEB_ORIGINS;
  if (!webOrigins?.trim()) {
    throw new Error('WEB_ORIGINS must be configured in the backend environment.');
  }

  const allowedOrigins = webOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (allowedOrigins.length === 0) {
    throw new Error('WEB_ORIGINS must contain at least one allowed origin.');
  }

  return allowedOrigins;
}

export const appConfig = registerAs('app', (): AppConfig => ({
  port: parseInt(process.env.PORT || '3000', 10),
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgrespassword@localhost:5432/student_rewards?schema=public',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  storageProvider: (process.env.STORAGE_PROVIDER as 'local' | 'minio' | 's3') || 'local',
  minioEndpoint: process.env.MINIO_ENDPOINT || 'localhost',
  minioPort: parseInt(process.env.MINIO_PORT || '9000', 10),
  minioUseSsl: process.env.MINIO_USE_SSL === 'true',
  minioAccessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  minioSecretKey: process.env.MINIO_SECRET_KEY || 'minioadminpassword',
  minioBucket: process.env.MINIO_BUCKET || 'student-rewards',
  sessionSecret:
    process.env.SESSION_SECRET || 'default-insecure-session-secret-change-in-production',
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID || '',
  allowedOrigins: getAllowedOrigins(),
  activityBanDurationDays: parseInt(process.env.ACTIVITY_BAN_DURATION_DAYS || '30', 10),
}));
