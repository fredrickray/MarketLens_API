import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { SecurityAuditEvent } from '../../../core/enums/security-audit-event.enum';

export type SecurityAuditDocument = HydratedDocument<SecurityAudit>;

@Schema({ timestamps: true, collection: 'security_audits' })
export class SecurityAudit {
  @Prop({ required: true, enum: SecurityAuditEvent, index: true })
  event!: SecurityAuditEvent;

  @Prop({ type: String, default: null, index: true })
  userId?: string | null;

  @Prop({ type: String, default: null })
  email?: string | null;

  @Prop({ type: String, default: null })
  ip?: string | null;

  @Prop({ type: String, default: null })
  userAgent?: string | null;

  @Prop({ type: String, default: null, index: true })
  requestId?: string | null;

  @Prop({ type: Object, default: {} })
  metadata!: Record<string, unknown>;

  createdAt?: Date;
  updatedAt?: Date;
}

export const SecurityAuditSchema = SchemaFactory.createForClass(SecurityAudit);

SecurityAuditSchema.index({ createdAt: -1 });
SecurityAuditSchema.index({ event: 1, createdAt: -1 });
/** Default 90d retention; align with SECURITY_AUDIT_RETENTION_DAYS if you change TTL. */
SecurityAuditSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 },
);
