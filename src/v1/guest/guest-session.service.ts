import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { randomUUID } from 'node:crypto';
import { Model } from 'mongoose';
import { ResourceNotFound } from '../../core/exceptions/http.errors';
import {
  GuestSession,
  type GuestSessionDocument,
} from './schemas/guest-session.schema';
import type { UpdatePreferencesDto } from '../users/dto/update-preferences.dto';

@Injectable()
export class GuestSessionService {
  constructor(
    @InjectModel(GuestSession.name)
    private readonly guestModel: Model<GuestSessionDocument>,
    private readonly config: ConfigService,
  ) {}

  async createSession(): Promise<GuestSessionDocument> {
    const token = randomUUID();
    const ttlDays = this.config.get<number>('guest.sessionTtlDays') ?? 7;
    const expiresAt = new Date(Date.now() + ttlDays * 86_400_000);

    return this.guestModel.create({
      sessionToken: token,
      expiresAt,
    });
  }

  async findValidByToken(token: string): Promise<GuestSessionDocument | null> {
    return this.guestModel
      .findOne({ sessionToken: token, expiresAt: { $gt: new Date() } })
      .exec();
  }

  async updatePreferences(
    token: string,
    dto: UpdatePreferencesDto,
  ): Promise<GuestSessionDocument> {
    const guest = await this.findValidByToken(token);
    if (!guest) {
      throw new ResourceNotFound('Guest session not found or expired');
    }

    if (dto.time_horizon !== undefined) {
      guest.preferences.timeHorizon = dto.time_horizon;
    }
    if (dto.risk_tolerance !== undefined) {
      guest.preferences.riskTolerance = dto.risk_tolerance;
    }

    await guest.save();
    return guest;
  }
}
