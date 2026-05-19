import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsMongoId,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { SecurityAuditEvent } from '../../../core/enums/security-audit-event.enum';

export class SecurityAuditQueryDto {
  @IsOptional()
  @IsEnum(SecurityAuditEvent)
  event?: SecurityAuditEvent;

  @IsOptional()
  @IsMongoId()
  userId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}
