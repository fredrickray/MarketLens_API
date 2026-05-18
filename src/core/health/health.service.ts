import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import { ConnectionStates, type Connection } from 'mongoose';
import type { HealthCheckResult, HealthResponse } from '../types/health.types';
import { RedisService } from '../../cache/redis.service';
import { MlClient } from '../../integrations/ml-service/ml.client';

@Injectable()
export class HealthService {
  constructor(
    private readonly config: ConfigService,
    @InjectConnection() private readonly connection: Connection,
    private readonly redis: RedisService,
    private readonly mlClient: MlClient,
  ) {}

  async getHealth(): Promise<HealthResponse> {
    const [database, redis, ml] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkMl(),
    ]);

    const checks = { database, redis, ml };
    const status = this.aggregateStatus(checks);

    return {
      status,
      timestamp: new Date().toISOString(),
      version: this.config.get<string>('app.version') ?? '0.0.1',
      environment: this.config.get<string>('app.nodeEnv') ?? 'development',
      checks,
    };
  }

  private aggregateStatus(
    checks: HealthResponse['checks'],
  ): HealthResponse['status'] {
    const values = Object.values(checks);
    if (values.some((c) => c.status === 'down')) {
      return 'error';
    }
    if (values.some((c) => c.status === 'degraded')) {
      return 'degraded';
    }
    return 'ok';
  }

  private async checkDatabase(): Promise<HealthCheckResult> {
    const started = Date.now();
    try {
      const state = this.connection.readyState;
      if (state !== ConnectionStates.connected) {
        return {
          status: 'down',
          message: `MongoDB connection state: ${state}`,
          latencyMs: Date.now() - started,
        };
      }
      await this.connection.db?.admin().ping();
      return { status: 'up', latencyMs: Date.now() - started };
    } catch (error) {
      return {
        status: 'down',
        message:
          error instanceof Error ? error.message : 'Database unreachable',
        latencyMs: Date.now() - started,
      };
    }
  }

  private async checkRedis(): Promise<HealthCheckResult> {
    const enabled = this.config.get<boolean>('redis.enabled') ?? false;
    if (!enabled) {
      return {
        status: 'skipped',
        message: 'REDIS_URL not configured (in-memory cache bypass)',
      };
    }

    const started = Date.now();
    const ok = await this.redis.ping();
    const latencyMs = Date.now() - started;

    if (!ok) {
      return {
        status: 'degraded',
        message: 'Redis unreachable; market cache disabled',
        latencyMs,
      };
    }

    return { status: 'up', latencyMs };
  }

  private async checkMl(): Promise<HealthCheckResult> {
    const mock = this.config.get<boolean>('ml.mock') ?? true;
    if (mock) {
      return { status: 'mock', message: 'ML service running in mock mode' };
    }

    const started = Date.now();
    const reachable = await this.mlClient.ping();
    const latencyMs = Date.now() - started;

    if (!reachable) {
      return {
        status: 'degraded',
        message: 'ML service unreachable',
        latencyMs,
      };
    }

    return { status: 'up', latencyMs };
  }
}
