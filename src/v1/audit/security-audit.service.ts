import { Injectable, Logger } from '@nestjs/common';
import type { Request } from 'express';
import { RequestContextService } from '../../core/context/request-context.service';
import { SecurityAuditEvent } from '../../core/enums/security-audit-event.enum';
import { getClientIp } from '../../core/utils/client-ip.util';
import type { CreateSecurityAuditInput } from './security-audit.repository';
import { SecurityAuditRepository } from './security-audit.repository';

export interface SecurityAuditLogInput {
  event: SecurityAuditEvent;
  userId?: string | null;
  email?: string | null;
  req?: Request;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class SecurityAuditService {
  private readonly logger = new Logger(SecurityAuditService.name);

  constructor(
    private readonly repository: SecurityAuditRepository,
    private readonly requestContext: RequestContextService,
  ) {}

  async log(input: SecurityAuditLogInput): Promise<void> {
    const record: CreateSecurityAuditInput = {
      event: input.event,
      userId: input.userId ?? null,
      email: input.email ?? null,
      ip: input.req ? getClientIp(input.req) : null,
      userAgent:
        typeof input.req?.headers['user-agent'] === 'string'
          ? input.req.headers['user-agent']
          : null,
      requestId:
        input.req?.requestId ?? this.requestContext.getRequestId() ?? null,
      metadata: input.metadata ?? {},
    };

    try {
      await this.repository.create(record);
    } catch (error) {
      this.logger.error(
        `Failed to persist security audit event ${input.event}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
