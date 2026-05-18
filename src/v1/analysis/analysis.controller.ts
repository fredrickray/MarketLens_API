import { Controller, Get, Param, Query } from '@nestjs/common';
import { StockSymbolParamDto } from '../stocks/dto/stock-symbol-param.dto';
import { AnalysisService } from './analysis.service';
import { AnalysisQueryDto } from './dto/analysis-query.dto';

@Controller('stocks')
export class AnalysisController {
  constructor(private readonly analysis: AnalysisService) {}

  @Get(':symbol/analysis')
  getAnalysis(
    @Param() params: StockSymbolParamDto,
    @Query() query: AnalysisQueryDto,
  ) {
    return this.analysis.analyze(params.symbol, {
      time_horizon: query.time_horizon,
      risk_tolerance: query.risk_tolerance,
    });
  }
}
