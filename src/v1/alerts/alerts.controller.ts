import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { SecurityAuditEvent } from '../../core/enums/security-audit-event.enum';
import { SecurityAuditService } from '../audit/security-audit.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UserDocument } from '../users/schemas/user.schema';
import { AlertsService } from './alerts.service';
import { CreateAlertDto } from './dto/create-alert.dto';
import { UpdateAlertDto } from './dto/update-alert.dto';

@Controller('alerts')
@UseGuards(AuthGuard('jwt'))
export class AlertsController {
  constructor(
    private readonly alerts: AlertsService,
    private readonly securityAudit: SecurityAuditService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: UserDocument,
    @Body() dto: CreateAlertDto,
    @Req() req: Request,
  ) {
    const result = await this.alerts.create(user, dto);
    await this.securityAudit.log({
      event: SecurityAuditEvent.ALERT_CREATED,
      userId: String(user._id),
      email: user.email,
      req,
      metadata: { symbol: dto.symbol, type: dto.type },
    });
    return result;
  }

  @Get()
  list(@CurrentUser() user: UserDocument) {
    return this.alerts.list(user);
  }

  @Get(':id')
  getOne(@CurrentUser() user: UserDocument, @Param('id') id: string) {
    return this.alerts.getOne(user, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: UserDocument,
    @Param('id') id: string,
    @Body() dto: UpdateAlertDto,
  ) {
    return this.alerts.update(user, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @CurrentUser() user: UserDocument,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const result = await this.alerts.remove(user, id);
    await this.securityAudit.log({
      event: SecurityAuditEvent.ALERT_DELETED,
      userId: String(user._id),
      email: user.email,
      req,
      metadata: { alertId: id },
    });
    return result;
  }
}
