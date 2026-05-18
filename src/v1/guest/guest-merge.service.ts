import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { GuestSessionService } from './guest-session.service';
import { WatchlistService } from '../watchlist/watchlist.service';
import type { UserDocument } from '../users/schemas/user.schema';
@Injectable()
export class GuestMergeService {
  constructor(
    private readonly guests: GuestSessionService,
    private readonly users: UsersService,
    private readonly watchlists: WatchlistService,
  ) {}

  async mergeGuestSessionIntoUser(
    user: UserDocument,
    guestSessionId: string | undefined,
  ): Promise<{ merged: boolean }> {
    if (!guestSessionId) {
      return { merged: false };
    }

    const guest = await this.guests.findValidByToken(guestSessionId);
    if (!guest) {
      return { merged: false };
    }

    if (!user.preferences?.timeHorizon) {
      user.preferences = guest.preferences;
    } else {
      user.preferences.timeHorizon =
        user.preferences.timeHorizon ?? guest.preferences.timeHorizon;
      user.preferences.riskTolerance =
        user.preferences.riskTolerance ?? guest.preferences.riskTolerance;
    }

    await user.save();
    await this.watchlists.mergeGuestIntoUser(guestSessionId, String(user._id));

    return { merged: true };
  }
}
