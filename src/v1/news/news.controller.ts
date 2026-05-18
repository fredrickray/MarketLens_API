import { Controller, Get, Param, Query } from '@nestjs/common';
import { StockSymbolParamDto } from '../stocks/dto/stock-symbol-param.dto';
import { NewsQueryDto } from './dto/news-query.dto';
import { NewsService } from './news.service';

@Controller('stocks')
export class NewsController {
  constructor(private readonly news: NewsService) {}

  @Get(':symbol/news')
  getNews(@Param() params: StockSymbolParamDto, @Query() query: NewsQueryDto) {
    return this.news.getNews(params.symbol, query);
  }
}
