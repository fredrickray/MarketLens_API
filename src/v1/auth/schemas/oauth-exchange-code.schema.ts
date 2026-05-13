import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type OauthExchangeCodeDocument = HydratedDocument<OauthExchangeCode>;

@Schema({ timestamps: true, collection: 'oauth_exchange_codes' })
export class OauthExchangeCode {
  @Prop({ required: true, unique: true })
  code!: string;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  userId!: Types.ObjectId;

  @Prop({ type: Date, required: true })
  expiresAt!: Date;

  @Prop({ type: Date, default: null })
  usedAt?: Date | null;
}

export const OauthExchangeCodeSchema =
  SchemaFactory.createForClass(OauthExchangeCode);

OauthExchangeCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
