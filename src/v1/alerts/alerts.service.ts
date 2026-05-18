import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Types } from 'mongoose';
import { FINANCIAL_DISCLAIMER } from '../../core/constants/disclaimer.constant';
import { AlertType } from '../../core/enums/alert-type.enum';
import {
  InvalidInput,
  ResourceNotFound,
  TooManyRequests,
} from '../../core/exceptions/http.errors';
import { normalizeSymbol } from '../../core/utils/symbol.util';
import type { UserDocument } from '../users/schemas/user.schema';
import type { CreateAlertDto } from './dto/create-alert.dto';
import type { UpdateAlertDto } from './dto/update-alert.dto';
import { AlertsRepository } from './alerts.repository';
import type { AlertDocument } from './schemas/alert.schema';

@Injectable()
export class AlertsService {
  constructor(
    private readonly config: ConfigService,
    private readonly repository: AlertsRepository,
  ) {}

  async create(user: UserDocument, dto: CreateAlertDto) {
    this.validateDtoForType(dto);

    const maxPerUser = this.config.get<number>('alerts.maxPerUser') ?? 25;
    const count = await this.repository.countByUser(String(user._id));
    if (count >= maxPerUser) {
      throw new TooManyRequests(
        `Maximum of ${maxPerUser} alerts per user reached`,
      );
    }

    const symbol = normalizeSymbol(dto.symbol);
    const alert = await this.repository.create({
      userId: new Types.ObjectId(String(user._id)),
      symbol,
      type: dto.type,
      targetPrice: dto.targetPrice,
      thresholdPercent: dto.thresholdPercent,
      targetAction: dto.targetAction,
      isActive: true,
      notifyEmail: true,
      lastKnownAction: null,
      lastKnownPrice: null,
    });

    return {
      data: this.serialize(alert),
      disclaimer: FINANCIAL_DISCLAIMER,
    };
  }

  async list(user: UserDocument) {
    const alerts = await this.repository.findByUser(String(user._id));
    return {
      data: alerts.map((a) => this.serialize(a)),
      meta: { count: alerts.length },
      disclaimer: FINANCIAL_DISCLAIMER,
    };
  }

  async getOne(user: UserDocument, id: string) {
    const alert = await this.repository.findByIdForUser(id, String(user._id));
    if (!alert) {
      throw new ResourceNotFound('Alert not found');
    }
    return {
      data: this.serialize(alert),
      disclaimer: FINANCIAL_DISCLAIMER,
    };
  }

  async update(user: UserDocument, id: string, dto: UpdateAlertDto) {
    const alert = await this.repository.updateById(id, String(user._id), dto);
    if (!alert) {
      throw new ResourceNotFound('Alert not found');
    }
    return {
      data: this.serialize(alert),
      disclaimer: FINANCIAL_DISCLAIMER,
    };
  }

  async remove(user: UserDocument, id: string) {
    const alert = await this.repository.deleteById(id, String(user._id));
    if (!alert) {
      throw new ResourceNotFound('Alert not found');
    }
    return {
      data: { id: String(alert._id), deleted: true },
      disclaimer: FINANCIAL_DISCLAIMER,
    };
  }

  private validateDtoForType(dto: CreateAlertDto): void {
    if (
      [AlertType.PRICE_ABOVE, AlertType.PRICE_BELOW].includes(dto.type) &&
      dto.targetPrice === undefined
    ) {
      throw new InvalidInput('targetPrice is required for price alerts');
    }
    if (
      dto.type === AlertType.PRICE_CHANGE_PERCENT &&
      dto.thresholdPercent === undefined
    ) {
      throw new InvalidInput(
        'thresholdPercent is required for percent change alerts',
      );
    }
  }

  private serialize(alert: AlertDocument) {
    return {
      id: String(alert._id),
      symbol: alert.symbol,
      type: alert.type,
      targetPrice: alert.targetPrice,
      thresholdPercent: alert.thresholdPercent,
      targetAction: alert.targetAction,
      isActive: alert.isActive,
      notifyEmail: alert.notifyEmail,
      lastTriggeredAt: alert.lastTriggeredAt?.toISOString() ?? null,
      createdAt:
        (
          alert as AlertDocument & { createdAt?: Date }
        ).createdAt?.toISOString() ?? null,
    };
  }
}
