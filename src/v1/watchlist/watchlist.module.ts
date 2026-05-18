import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GuestModule } from '../guest/guest.module';
import { Watchlist, WatchlistSchema } from './schemas/watchlist.schema';
import { WatchlistController } from './watchlist.controller';
import { WatchlistService } from './watchlist.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Watchlist.name, schema: WatchlistSchema },
    ]),
    forwardRef(() => GuestModule),
  ],
  controllers: [WatchlistController],
  providers: [WatchlistService],
  exports: [WatchlistService],
})
export class WatchlistModule {}
