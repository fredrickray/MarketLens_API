import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import {
  UserPreferences,
  UserPreferencesSchema,
} from '../../users/schemas/user-preferences.schema';

export type GuestSessionDocument = HydratedDocument<GuestSession>;

@Schema({ timestamps: true, collection: 'guest_sessions' })
export class GuestSession {
  @Prop({ required: true, unique: true })
  sessionToken!: string;

  @Prop({ type: UserPreferencesSchema, default: () => ({}) })
  preferences!: UserPreferences;

  @Prop({ type: Date, required: true })
  expiresAt!: Date;
}

export const GuestSessionSchema = SchemaFactory.createForClass(GuestSession);

GuestSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
