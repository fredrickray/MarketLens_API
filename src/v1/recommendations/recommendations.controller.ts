import { Controller, Get, Param, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FINANCIAL_DISCLAIMER } from '../../core/constants/disclaimer.constant';
import { StockSymbolParamDto } from '../stocks/dto/stock-symbol-param.dto';
import { RecommendationHistoryQueryDto } from './dto/recommendation-history-query.dto';
import { RecommendationsRepository } from './recommendations.repository';

@Controller('recommendations')
export class RecommendationsController {
  constructor(
    private readonly repository: RecommendationsRepository,
    private readonly config: ConfigService,
  ) {}

  @Get(':symbol/history')
  async getHistory(
    @Param() params: StockSymbolParamDto,
    @Query() query: RecommendationHistoryQueryDto,
  ) {
    const defaultLimit =
      this.config.get<number>('compliance.auditHistoryDefaultLimit') ?? 20;
    const limit = query.limit ?? defaultLimit;
    const records = await this.repository.findBySymbol(params.symbol, limit);

    return {
      data: records.map((record) => ({
        symbol: record.symbol,
        finalAction: record.finalAction,
        rawAction: record.rawAction,
        finalConfidence: record.finalConfidence,
        rawConfidence: record.rawConfidence,
        modelVersion: record.modelVersion,
        mlMode: record.mlMode,
        timeHorizon: record.timeHorizon,
        riskTolerance: record.riskTolerance,
        rulesApplied: record.rulesApplied,
        warnings: record.warnings,
        wasCached: record.wasCached,
        isInformationalOnly: record.isInformationalOnly,
        marketProvider: record.marketProvider,
        servedAt: record.createdAt ?? null,
      })),
      meta: {
        symbol: params.symbol.toUpperCase(),
        limit,
        count: records.length,
      },
      disclaimer: FINANCIAL_DISCLAIMER,
    };
  }
}
