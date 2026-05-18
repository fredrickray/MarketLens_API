export type HealthCheckStatus = 'up' | 'down' | 'skipped' | 'mock' | 'degraded';

export interface HealthCheckResult {
  status: HealthCheckStatus;
  message?: string;
  latencyMs?: number;
}

export interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  version: string;
  environment: string;
  checks: {
    database: HealthCheckResult;
    redis: HealthCheckResult;
    ml: HealthCheckResult;
  };
}
