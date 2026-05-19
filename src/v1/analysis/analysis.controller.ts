import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthActorParam } from '../../core/decorators/auth-actor.decorator';
import { OptionalAuthGuard } from '../../core/guards/optional-auth.guard';
import type { AuthActor } from '../../core/types/auth-context.types';
import { resolvePreferences } from '../../core/utils/preferences.util';
import { StockSymbolParamDto } from '../stocks/dto/stock-symbol-param.dto';
import { AnalysisService } from './analysis.service';
import { AnalysisQueryDto } from './dto/analysis-query.dto';

@Controller('stocks')
export class AnalysisController {
  constructor(private readonly analysis: AnalysisService) {}

  @Get(':symbol/analysis')
  @Throttle({ analysis: { ttl: 60_000, limit: 30 } })
  @UseGuards(OptionalAuthGuard)
  getAnalysis(
    @Param() params: StockSymbolParamDto,
    @Query() query: AnalysisQueryDto,
    @AuthActorParam() actor: AuthActor,
  ) {
    const context = resolvePreferences(actor, {
      time_horizon: query.time_horizon,
      risk_tolerance: query.risk_tolerance,
    });

    return this.analysis.analyze(
      params.symbol,
      {
        time_horizon: context.time_horizon,
        risk_tolerance: context.risk_tolerance,
      },
      { userId: actor.user ? String(actor.user._id) : null },
    );
  }
}
