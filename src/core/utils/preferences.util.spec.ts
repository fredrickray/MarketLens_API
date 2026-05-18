import { TimeHorizon } from '../enums/time-horizon.enum';
import { resolvePreferences } from './preferences.util';

describe('resolvePreferences', () => {
  it('prefers query params over stored preferences', () => {
    const result = resolvePreferences(
      {
        user: {
          preferences: {
            timeHorizon: TimeHorizon.LONG,
            riskTolerance: 'low',
          },
        } as never,
      },
      { time_horizon: TimeHorizon.SHORT },
    );

    expect(result.time_horizon).toBe(TimeHorizon.SHORT);
    expect(result.risk_tolerance).toBe('low');
  });

  it('falls back to guest preferences', () => {
    const result = resolvePreferences({
      guest: {
        preferences: {
          timeHorizon: TimeHorizon.MEDIUM,
          riskTolerance: 'high',
        },
      } as never,
    });

    expect(result.risk_tolerance).toBe('high');
  });
});
