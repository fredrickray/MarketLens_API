import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { randomBytes } from 'node:crypto';
import { Model } from 'mongoose';
import { BadRequest } from '../../core/exceptions/http.errors';
import {
  OauthExchangeCode,
  OauthExchangeCodeDocument,
} from './schemas/oauth-exchange-code.schema';

@Injectable()
export class OAuthExchangeService {
  constructor(
    @InjectModel(OauthExchangeCode.name)
    private readonly model: Model<OauthExchangeCodeDocument>,
    private readonly config: ConfigService,
  ) {}

  async issueCodeForUserId(
    userId: string,
  ): Promise<{ code: string; expiresInSeconds: number }> {
    const ttlSec = this.config.get<number>(
      'OAUTH_EXCHANGE_CODE_TTL_SECONDS',
      600,
    );
    const code = randomBytes(24).toString('base64url');
    const expiresAt = new Date(Date.now() + ttlSec * 1000);
    await this.model.create({
      code,
      userId,
      expiresAt,
      usedAt: null,
    });
    return { code, expiresInSeconds: ttlSec };
  }

  async consumeCode(code: string): Promise<string> {
    const trimmed = code.trim();
    const doc = await this.model
      .findOneAndUpdate(
        {
          code: trimmed,
          usedAt: null,
          expiresAt: { $gt: new Date() },
        },
        { $set: { usedAt: new Date() } },
        { returnDocument: 'after' },
      )
      .exec();
    if (!doc) {
      throw new BadRequest('Invalid or expired authorization code.');
    }
    return String(doc.userId);
  }
}
