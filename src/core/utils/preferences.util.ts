import { TimeHorizon } from '../enums/time-horizon.enum';
import type {
  AuthActor,
  ResolvedPreferences,
} from '../types/auth-context.types';
import type { AnalysisContext } from '../types/analysis.types';

export function resolvePreferences(
  actor: AuthActor,
  query: AnalysisContext = {},
): ResolvedPreferences {
  const fromUser = actor.user?.preferences;
  const fromGuest = actor.guest?.preferences;

  return {
    time_horizon:
      query.time_horizon ??
      fromUser?.timeHorizon ??
      fromGuest?.timeHorizon ??
      TimeHorizon.MEDIUM,
    risk_tolerance:
      query.risk_tolerance ??
      fromUser?.riskTolerance ??
      fromGuest?.riskTolerance ??
      'medium',
  };
}

export function serializePreferences(prefs: {
  timeHorizon: TimeHorizon;
  riskTolerance: 'low' | 'medium' | 'high';
}) {
  return {
    time_horizon: prefs.timeHorizon,
    risk_tolerance: prefs.riskTolerance,
  };
}
