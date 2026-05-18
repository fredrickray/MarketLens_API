import type { TimeHorizon } from '../enums/time-horizon.enum';
import type { UserDocument } from '../../v1/users/schemas/user.schema';
import type { GuestSessionDocument } from '../../v1/guest/schemas/guest-session.schema';

export interface AuthActor {
  user?: UserDocument;
  guest?: GuestSessionDocument;
}

export interface ResolvedPreferences {
  time_horizon: TimeHorizon;
  risk_tolerance: 'low' | 'medium' | 'high';
}
