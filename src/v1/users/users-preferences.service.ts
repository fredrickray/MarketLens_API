import { Injectable } from '@nestjs/common';
import { UsersService } from './users.service';
import type { UserDocument } from './schemas/user.schema';
import type { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { serializePreferences } from '../../core/utils/preferences.util';

@Injectable()
export class UsersPreferencesService {
  constructor(private readonly users: UsersService) {}

  getPreferences(user: UserDocument) {
    return {
      data: serializePreferences(user.preferences),
    };
  }

  async updatePreferences(user: UserDocument, dto: UpdatePreferencesDto) {
    if (dto.time_horizon !== undefined) {
      user.preferences.timeHorizon = dto.time_horizon;
    }
    if (dto.risk_tolerance !== undefined) {
      user.preferences.riskTolerance = dto.risk_tolerance;
    }
    await user.save();
    return {
      data: serializePreferences(user.preferences),
    };
  }
}
