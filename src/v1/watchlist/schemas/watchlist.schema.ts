import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type WatchlistDocument = HydratedDocument<Watchlist>;

@Schema({ timestamps: true, collection: 'watchlists' })
export class Watchlist {
  @Prop({ type: Types.ObjectId })
  userId?: Types.ObjectId;

  @Prop({ type: String })
  guestSessionId?: string;

  @Prop({ type: [String], default: [] })
  symbols!: string[];
}

export const WatchlistSchema = SchemaFactory.createForClass(Watchlist);

WatchlistSchema.index({ userId: 1 }, { unique: true, sparse: true });
WatchlistSchema.index({ guestSessionId: 1 }, { unique: true, sparse: true });
