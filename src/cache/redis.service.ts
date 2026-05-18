import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;

  constructor(private readonly config: ConfigService) {}

  isEnabled(): boolean {
    return this.config.get<boolean>('redis.enabled') ?? false;
  }

  onModuleInit(): void {
    if (!this.isEnabled()) {
      this.logger.log('Redis disabled (REDIS_URL not set)');
      return;
    }

    const url = this.config.getOrThrow<string>('redis.url');
    this.client = new Redis(url, {
      maxRetriesPerRequest: 2,
      lazyConnect: true,
    });

    this.client.on('error', (error: Error) => {
      this.logger.error(`Redis error: ${error.message}`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
  }

  async ping(): Promise<boolean> {
    if (!this.client) {
      return false;
    }
    try {
      if (this.client.status !== 'ready') {
        await this.client.connect();
      }
      const result = await this.client.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }

  private prefixKey(key: string): string {
    const prefix = this.config.get<string>('redis.keyPrefix') ?? 'marketlens:';
    return `${prefix}${key}`;
  }

  async get(key: string): Promise<string | null> {
    if (!this.client) {
      return null;
    }
    try {
      return await this.client.get(this.prefixKey(key));
    } catch (error) {
      this.logger.warn(
        `Redis get failed: ${error instanceof Error ? error.message : 'unknown'}`,
      );
      return null;
    }
  }

  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.get(key);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.client) {
      return;
    }
    const prefixed = this.prefixKey(key);
    try {
      if (ttlSeconds && ttlSeconds > 0) {
        await this.client.set(prefixed, value, 'EX', ttlSeconds);
      } else {
        await this.client.set(prefixed, value);
      }
    } catch (error) {
      this.logger.warn(
        `Redis set failed: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }

  async setJson(
    key: string,
    value: unknown,
    ttlSeconds?: number,
  ): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }

  async del(key: string): Promise<void> {
    if (!this.client) {
      return;
    }
    try {
      await this.client.del(this.prefixKey(key));
    } catch (error) {
      this.logger.warn(
        `Redis del failed: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }
}
