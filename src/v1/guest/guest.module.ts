import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OptionalAuthGuard } from '../../core/guards/optional-auth.guard';
import { UsersModule } from '../users/users.module';
import { WatchlistModule } from '../watchlist/watchlist.module';
import { GuestController } from './guest.controller';
import { GuestMergeService } from './guest-merge.service';
import { GuestSessionService } from './guest-session.service';
import {
  GuestSession,
  GuestSessionSchema,
} from './schemas/guest-session.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GuestSession.name, schema: GuestSessionSchema },
    ]),
    UsersModule,
    forwardRef(() => WatchlistModule),
  ],
  controllers: [GuestController],
  providers: [GuestSessionService, GuestMergeService, OptionalAuthGuard],
  exports: [GuestSessionService, GuestMergeService, OptionalAuthGuard],
})
export class GuestModule {}
