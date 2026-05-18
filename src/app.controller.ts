import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { AppService } from './app.service';
import { HealthService } from './core/health/health.service';
import type { HealthResponse } from './core/types/health.types';

@SkipThrottle()
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly healthService: HealthService,
  ) {}

  @Get()
  getRoot(): { message: string; version: string } {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth(): Promise<HealthResponse> {
    return this.healthService.getHealth();
  }
}
