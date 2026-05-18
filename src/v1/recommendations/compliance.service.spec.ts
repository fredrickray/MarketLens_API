import { ComplianceService } from './compliance.service';
import { RecommendationAction } from '../../core/enums/recommendation-action.enum';

describe('ComplianceService', () => {
  const service = new ComplianceService();

  it('builds compliance envelope from recommendation', () => {
    const envelope = service.buildEnvelope({
      action: RecommendationAction.HOLD,
      confidence: 0.4,
      explanation: 'test',
      warnings: [],
      rulesApplied: ['buy_confidence_floor'],
      isInformationalOnly: true,
      wasAdjusted: true,
    });

    expect(envelope.isInformationalOnly).toBe(true);
    expect(envelope.rulesApplied).toContain('buy_confidence_floor');
    expect(envelope.disclaimer).toContain('not constitute financial advice');
  });
});
