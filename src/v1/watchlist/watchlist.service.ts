import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FINANCIAL_DISCLAIMER } from '../../core/constants/disclaimer.constant';
import {
  InvalidInput,
  ResourceNotFound,
  TooManyRequests,
} from '../../core/exceptions/http.errors';
import type { AuthActor } from '../../core/types/auth-context.types';
import { normalizeSymbol } from '../../core/utils/symbol.util';
import { Watchlist, type WatchlistDocument } from './schemas/watchlist.schema';

const MAX_WATCHLIST_SIZE = 50;

@Injectable()
export class WatchlistService {
  constructor(
    @InjectModel(Watchlist.name)
    private readonly watchlistModel: Model<WatchlistDocument>,
  ) {}

  async list(actor: AuthActor) {
    const doc = await this.getOrCreate(actor);
    return {
      data: { symbols: doc.symbols },
      meta: { count: doc.symbols.length },
      disclaimer: FINANCIAL_DISCLAIMER,
    };
  }

  async add(actor: AuthActor, symbol: string) {
    const normalized = normalizeSymbol(symbol);
    const doc = await this.getOrCreate(actor);

    if (doc.symbols.includes(normalized)) {
      throw new InvalidInput(`${normalized} is already on your watchlist`);
    }
    if (doc.symbols.length >= MAX_WATCHLIST_SIZE) {
      throw new TooManyRequests(
        `Watchlist limit of ${MAX_WATCHLIST_SIZE} symbols reached`,
      );
    }

    doc.symbols.push(normalized);
    await doc.save();

    return {
      data: { symbols: doc.symbols },
      disclaimer: FINANCIAL_DISCLAIMER,
    };
  }

  async remove(actor: AuthActor, symbol: string) {
    const normalized = normalizeSymbol(symbol);
    const doc = await this.findForActor(actor);
    if (!doc) {
      throw new ResourceNotFound('Watchlist not found');
    }

    const next = doc.symbols.filter((s) => s !== normalized);
    if (next.length === doc.symbols.length) {
      throw new ResourceNotFound(`${normalized} is not on your watchlist`);
    }

    doc.symbols = next;
    await doc.save();

    return {
      data: { symbols: doc.symbols },
      disclaimer: FINANCIAL_DISCLAIMER,
    };
  }

  async mergeGuestIntoUser(
    guestSessionId: string,
    userId: string,
  ): Promise<void> {
    const guestList = await this.watchlistModel
      .findOne({ guestSessionId })
      .exec();
    if (!guestList || guestList.symbols.length === 0) {
      await this.watchlistModel.deleteOne({ guestSessionId });
      return;
    }

    const userObjectId = new Types.ObjectId(userId);
    const userList = await this.watchlistModel
      .findOne({ userId: userObjectId })
      .exec();

    if (!userList) {
      await this.watchlistModel.create({
        userId: userObjectId,
        symbols: guestList.symbols.slice(0, MAX_WATCHLIST_SIZE),
      });
    } else {
      userList.symbols = [
        ...new Set([...userList.symbols, ...guestList.symbols]),
      ].slice(0, MAX_WATCHLIST_SIZE);
      await userList.save();
    }

    await this.watchlistModel.deleteOne({ guestSessionId });
  }

  private async getOrCreate(actor: AuthActor): Promise<WatchlistDocument> {
    const existing = await this.findForActor(actor);
    if (existing) {
      return existing;
    }

    const owner = this.resolveOwner(actor);
    if (!owner.userId && !owner.guestSessionId) {
      throw new InvalidInput('Authentication or guest session required');
    }

    return this.watchlistModel.create({
      ...owner,
      symbols: [],
    });
  }

  private findForActor(actor: AuthActor): Promise<WatchlistDocument | null> {
    const owner = this.resolveOwner(actor);
    if (owner.userId) {
      return this.watchlistModel.findOne({ userId: owner.userId }).exec();
    }
    if (owner.guestSessionId) {
      return this.watchlistModel
        .findOne({ guestSessionId: owner.guestSessionId })
        .exec();
    }
    return Promise.resolve(null);
  }

  private resolveOwner(actor: AuthActor): {
    userId?: Types.ObjectId;
    guestSessionId?: string;
  } {
    if (actor.user) {
      return { userId: new Types.ObjectId(String(actor.user._id)) };
    }
    if (actor.guest) {
      return { guestSessionId: actor.guest.sessionToken };
    }
    return {};
  }
}
