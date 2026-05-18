import { Global, Module } from '@nestjs/common';
import { MlClient } from './ml.client';
import { MlService } from './ml.service';

@Global()
@Module({
  providers: [MlClient, MlService],
  exports: [MlClient, MlService],
})
export class MlModule {}
