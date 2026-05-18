import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  RecommendationAudit,
  type RecommendationAuditDocument,
} from './schemas/recommendation-audit.schema';

export interface CreateRecommendationAuditInput {
  symbol: string;
  userId?: string | null;
  finalAction: RecommendationAudit['finalAction'];
  rawAction: RecommendationAudit['rawAction'];
  finalConfidence: number;
  rawConfidence: number;
  modelVersion?: string | null;
  mlMode: RecommendationAudit['mlMode'];
  timeHorizon?: RecommendationAudit['timeHorizon'];
  riskTolerance?: RecommendationAudit['riskTolerance'];
  rulesApplied: string[];
  warnings: string[];
  wasCached: boolean;
  marketProvider: string;
  isInformationalOnly: boolean;
}

@Injectable()
export class RecommendationsRepository {
  constructor(
    @InjectModel(RecommendationAudit.name)
    private readonly auditModel: Model<RecommendationAuditDocument>,
  ) {}

  create(
    input: CreateRecommendationAuditInput,
  ): Promise<RecommendationAuditDocument> {
    return this.auditModel.create(input);
  }

  findBySymbol(symbol: string, limit: number): Promise<RecommendationAudit[]> {
    return this.auditModel
      .find({ symbol: symbol.toUpperCase() })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();
  }
}
