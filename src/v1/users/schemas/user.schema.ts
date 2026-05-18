import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { UserRole } from '../../../core/enum';
import {
  UserPreferences,
  UserPreferencesSchema,
} from './user-preferences.schema';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, trim: true })
  firstName!: string;

  @Prop({ required: true, trim: true })
  lastName!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ type: String, required: false, default: null, select: false })
  passwordHash?: string | null;

  @Prop({ unique: true, sparse: true })
  googleId?: string;

  @Prop({ enum: UserRole, default: UserRole.USER })
  role!: UserRole;

  @Prop({ default: false })
  isVerified!: boolean;

  @Prop({ type: String, select: false, default: null })
  verificationOtpHash?: string | null;

  @Prop({ type: Date, default: null })
  verificationOtpExpiresAt?: Date | null;

  @Prop({ default: 0 })
  verificationOtpAttempts!: number;

  @Prop({ type: Date, default: null })
  loginCooldown?: Date | null;

  @Prop({ default: 0 })
  loginAttempts!: number;

  @Prop({ type: UserPreferencesSchema, default: () => ({}) })
  preferences!: UserPreferences;
}

export const UserSchema = SchemaFactory.createForClass(User);
