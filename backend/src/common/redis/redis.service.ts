import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface SessionData {
  userId: string;
  nationalId: string;
  username: string;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT';
  accountState: 'ACTIVE' | 'INACTIVE' | 'DEACTIVATED' | 'DEPARTED';
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;
  private readonly logger = new Logger(RedisService.name);

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const redisUrl = this.configService.get<string>('app.redisUrl') || 'redis://localhost:6379';
    this.client = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
    });

    this.client.on('error', (err) => {
      this.logger.error(`Redis connection error: ${err.message}`, err.stack);
    });
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
  }

  getClient(): Redis {
    return this.client;
  }

  async createSession(sessionId: string, data: SessionData, ttlSeconds = 86400): Promise<void> {
    await this.client.set(`session:${sessionId}`, JSON.stringify(data), 'EX', ttlSeconds);
  }

  async getSession(sessionId: string): Promise<SessionData | null> {
    const raw = await this.client.get(`session:${sessionId}`);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as SessionData;
    } catch {
      return null;
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.client.del(`session:${sessionId}`);
  }

  async extendSession(sessionId: string, ttlSeconds = 86400): Promise<void> {
    await this.client.expire(`session:${sessionId}`, ttlSeconds);
  }
}
