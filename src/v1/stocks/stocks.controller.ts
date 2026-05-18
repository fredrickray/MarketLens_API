import { Controller, Get, Param, Query } from '@nestjs/common';
import { SearchStocksQueryDto } from './dto/search-stocks-query.dto';
import { StockSymbolParamDto } from './dto/stock-symbol-param.dto';
import { StocksService } from './stocks.service';

@Controller('stocks')
export class StocksController {
  constructor(private readonly stocks: StocksService) {}

  @Get('search')
  search(@Query() query: SearchStocksQueryDto) {
    return this.stocks.search(query.q, query.limit);
  }

  @Get(':symbol/overview')
  overview(@Param() params: StockSymbolParamDto) {
    return this.stocks.getOverview(params.symbol);
  }
}
