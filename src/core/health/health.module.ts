import { Module } from '@nestjs/common';
import { RedisModule } from '../../cache/redis.module';
import { MlModule } from '../../integrations/ml-service/ml.module';
import { HealthService } from './health.service';

@Module({
  imports: [RedisModule, MlModule],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {}
