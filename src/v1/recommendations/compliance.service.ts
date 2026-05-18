import { Injectable } from '@nestjs/common';
import {
  FINANCIAL_DISCLAIMER,
  FINANCIAL_DISCLAIMER_SHORT,
} from '../../core/constants/disclaimer.constant';
import type { ComplianceEnvelope } from '../../core/types/compliance.types';
import type { ProductRecommendation } from '../../core/types/analysis.types';

@Injectable()
export class ComplianceService {
  buildEnvelope(recommendation: ProductRecommendation): ComplianceEnvelope {
    return {
      disclaimer: FINANCIAL_DISCLAIMER,
      shortDisclaimer: FINANCIAL_DISCLAIMER_SHORT,
      isInformationalOnly: recommendation.isInformationalOnly,
      rulesApplied: recommendation.rulesApplied,
    };
  }
}
