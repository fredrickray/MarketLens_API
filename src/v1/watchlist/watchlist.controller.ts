import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthActorParam } from '../../core/decorators/auth-actor.decorator';
import { OptionalAuthGuard } from '../../core/guards/optional-auth.guard';
import type { AuthActor } from '../../core/types/auth-context.types';
import { StockSymbolParamDto } from '../stocks/dto/stock-symbol-param.dto';
import { AddWatchlistSymbolDto } from './dto/add-watchlist-symbol.dto';
import { WatchlistService } from './watchlist.service';

@Controller('watchlist')
@UseGuards(OptionalAuthGuard)
export class WatchlistController {
  constructor(private readonly watchlist: WatchlistService) {}

  @Get()
  list(@AuthActorParam() actor: AuthActor) {
    return this.watchlist.list(actor);
  }

  @Post()
  add(@AuthActorParam() actor: AuthActor, @Body() dto: AddWatchlistSymbolDto) {
    return this.watchlist.add(actor, dto.symbol);
  }

  @Delete(':symbol')
  remove(
    @AuthActorParam() actor: AuthActor,
    @Param() params: StockSymbolParamDto,
  ) {
    return this.watchlist.remove(actor, params.symbol);
  }
}
