import { Module } from '@nestjs/common';
import { MarketDataModule } from '../../integrations/market-data/market-data.module';
import { StocksController } from './stocks.controller';
import { StocksRepository } from './stocks.repository';
import { StocksService } from './stocks.service';

@Module({
  imports: [MarketDataModule],
  controllers: [StocksController],
  providers: [StocksService, StocksRepository],
  exports: [StocksService],
})
export class StocksModule {}
