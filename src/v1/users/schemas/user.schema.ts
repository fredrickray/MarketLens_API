import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { UserRole } from '../../../core/enum';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, trim: true })
  firstName!: string;

  @Prop({ required: true, trim: true })
  lastName!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true, select: false })
  passwordHash!: string;

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
}

export const UserSchema = SchemaFactory.createForClass(User);
