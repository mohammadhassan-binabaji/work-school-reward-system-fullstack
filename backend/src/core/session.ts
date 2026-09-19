import { randomUUID } from 'node:crypto';
import { redis } from './redis.js';
import { config } from './config.js';
import { logger } from './logger.js';

export interface SessionData {
  sessionId: string;
  userId: string;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT';
  nationalId: string;
  firstName: string;
  lastName: string;
  accountState: string;
  createdAt: string;
  expiresAt: string;
}

export class SessionStore {
  private static sessionKey(sessionId: string): string {
    return `session:${sessionId}`;
  }

  private static userSessionsKey(userId: string): string {
    return `user_sessions:${userId}`;
  }

  static async createSession(
    userData: Omit<SessionData, 'sessionId' | 'createdAt' | 'expiresAt'>
  ): Promise<SessionData> {
    const sessionId = randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + config.SESSION_TTL_SECONDS * 1000);

    const session: SessionData = {
      ...userData,
      sessionId,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString()
    };

    const sessionKey = this.sessionKey(sessionId);
    const userKey = this.userSessionsKey(userData.userId);

    const pipeline = redis.pipeline();
    pipeline.set(sessionKey, JSON.stringify(session), 'EX', config.SESSION_TTL_SECONDS);
    pipeline.sadd(userKey, sessionId);
    pipeline.expire(userKey, config.SESSION_TTL_SECONDS);
    await pipeline.exec();

    logger.debug({ userId: userData.userId, sessionId }, 'Created user session');
    return session;
  }

  static async getSession(sessionId: string): Promise<SessionData | null> {
    const sessionKey = this.sessionKey(sessionId);
    const raw = await redis.get(sessionKey);
    if (!raw) {
      return null;
    }

    try {
      const session = JSON.parse(raw) as SessionData;
      return session;
    } catch (err) {
      logger.error({ err, sessionId }, 'Failed to parse session JSON from Redis');
      return null;
    }
  }

  static async destroySession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    const sessionKey = this.sessionKey(sessionId);

    const pipeline = redis.pipeline();
    pipeline.del(sessionKey);

    if (session) {
      const userKey = this.userSessionsKey(session.userId);
      pipeline.srem(userKey, sessionId);
    }

    await pipeline.exec();
    logger.debug({ sessionId }, 'Destroyed session');
  }

  static async revokeUserSessions(userId: string): Promise<number> {
    const userKey = this.userSessionsKey(userId);
    const sessionIds = await redis.smembers(userKey);

    if (!sessionIds || sessionIds.length === 0) {
      return 0;
    }

    const pipeline = redis.pipeline();
    for (const sessionId of sessionIds) {
      pipeline.del(this.sessionKey(sessionId));
    }
    pipeline.del(userKey);
    await pipeline.exec();

    logger.info(
      { userId, revokedCount: sessionIds.length },
      'Immediately revoked all active user sessions'
    );
    return sessionIds.length;
  }
}
