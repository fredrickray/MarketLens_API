import { Module } from '@nestjs/common';
import { RolesGuard } from '../../core/guards/roles.guard';
import { AuditModule } from '../audit/audit.module';
import { AdminAuditController } from './admin-audit.controller';

@Module({
  imports: [AuditModule],
  controllers: [AdminAuditController],
  providers: [RolesGuard],
})
export class AdminModule {}
