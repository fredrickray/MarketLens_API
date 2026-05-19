import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  SecurityAudit,
  SecurityAuditSchema,
} from './schemas/security-audit.schema';
import { SecurityAuditRepository } from './security-audit.repository';
import { SecurityAuditService } from './security-audit.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SecurityAudit.name, schema: SecurityAuditSchema },
    ]),
  ],
  providers: [SecurityAuditRepository, SecurityAuditService],
  exports: [SecurityAuditService, SecurityAuditRepository],
})
export class AuditModule {}
