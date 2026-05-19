import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Roles } from '../../core/decorators/roles.decorator';
import { UserRole } from '../../core/enums/user-role.enum';
import { RolesGuard } from '../../core/guards/roles.guard';
import { SecurityAuditRepository } from '../audit/security-audit.repository';
import { SecurityAuditQueryDto } from './dto/security-audit-query.dto';

@Controller('admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminAuditController {
  constructor(
    private readonly securityAudits: SecurityAuditRepository,
    private readonly config: ConfigService,
  ) {}

  @Get('security-audit')
  async listSecurityAudit(@Query() query: SecurityAuditQueryDto) {
    const defaultLimit =
      this.config.get<number>('security.securityAuditDefaultLimit') ?? 50;
    const limit = query.limit ?? defaultLimit;
    const records = await this.securityAudits.findRecent({
      event: query.event,
      userId: query.userId,
      limit,
    });

    return {
      data: records.map((record) => ({
        event: record.event,
        userId: record.userId,
        email: record.email,
        ip: record.ip,
        requestId: record.requestId,
        metadata: record.metadata,
        createdAt: record.createdAt ?? null,
      })),
      meta: { limit, count: records.length },
    };
  }
}
