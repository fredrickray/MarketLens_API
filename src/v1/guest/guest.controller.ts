import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { serializePreferences } from '../../core/utils/preferences.util';
import { UpdatePreferencesDto } from '../users/dto/update-preferences.dto';
import { GuestSessionService } from './guest-session.service';

@Throttle({ default: { limit: 40, ttl: 60_000 } })
@Controller('guest')
export class GuestController {
  constructor(
    private readonly guestSessions: GuestSessionService,
    private readonly config: ConfigService,
  ) {}

  @Post('session')
  @SkipThrottle()
  @HttpCode(HttpStatus.CREATED)
  async createSession(@Req() req: Request) {
    const guest = await this.guestSessions.createSession();
    req.session.guestId = guest.sessionToken;
    const ttlDays = this.config.get<number>('guest.sessionTtlDays') ?? 7;
    if (req.session.cookie) {
      req.session.cookie.maxAge = ttlDays * 86_400_000;
    }

    return {
      data: {
        guestId: guest.sessionToken,
        expiresAt: guest.expiresAt.toISOString(),
        preferences: serializePreferences(guest.preferences),
      },
    };
  }

  @Get('me')
  async me(@Req() req: Request) {
    const guestId = req.session?.guestId;
    if (!guestId) {
      return { data: null };
    }

    const guest = await this.guestSessions.findValidByToken(guestId);
    if (!guest) {
      return { data: null };
    }

    return {
      data: {
        guestId: guest.sessionToken,
        expiresAt: guest.expiresAt.toISOString(),
        preferences: serializePreferences(guest.preferences),
      },
    };
  }

  @Post('preferences')
  async updatePreferences(
    @Req() req: Request,
    @Body() dto: UpdatePreferencesDto,
  ) {
    const guestId = req.session?.guestId;
    if (!guestId) {
      return {
        data: null,
        message: 'No guest session. POST /guest/session first.',
      };
    }

    const guest = await this.guestSessions.updatePreferences(guestId, dto);
    return {
      data: {
        preferences: serializePreferences(guest.preferences),
      },
    };
  }
}
