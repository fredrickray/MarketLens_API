import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  SecurityAudit,
  type SecurityAuditDocument,
} from './schemas/security-audit.schema';

export interface CreateSecurityAuditInput {
  event: SecurityAudit['event'];
  userId?: string | null;
  email?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface SecurityAuditQuery {
  event?: SecurityAudit['event'];
  userId?: string;
  limit: number;
  before?: Date;
}

@Injectable()
export class SecurityAuditRepository {
  constructor(
    @InjectModel(SecurityAudit.name)
    private readonly auditModel: Model<SecurityAuditDocument>,
  ) {}

  create(input: CreateSecurityAuditInput): Promise<SecurityAuditDocument> {
    return this.auditModel.create({
      event: input.event,
      userId: input.userId ?? null,
      email: input.email ?? null,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
      requestId: input.requestId ?? null,
      metadata: input.metadata ?? {},
    });
  }

  findRecent(query: SecurityAuditQuery): Promise<SecurityAudit[]> {
    const filter: Record<string, unknown> = {};
    if (query.event) {
      filter.event = query.event;
    }
    if (query.userId) {
      filter.userId = query.userId;
    }
    if (query.before) {
      filter.createdAt = { $lt: query.before };
    }

    return this.auditModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(query.limit)
      .lean()
      .exec();
  }
}
