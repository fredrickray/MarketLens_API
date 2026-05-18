import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { AlertType } from '../../../core/enums/alert-type.enum';
import { RecommendationAction } from '../../../core/enums/recommendation-action.enum';

export type AlertDocument = HydratedDocument<Alert>;

@Schema({ timestamps: true, collection: 'alerts' })
export class Alert {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, uppercase: true, trim: true, index: true })
  symbol!: string;

  @Prop({ required: true, enum: AlertType })
  type!: AlertType;

  @Prop({ type: Number })
  targetPrice?: number;

  @Prop({ type: Number })
  thresholdPercent?: number;

  @Prop({ type: String, enum: RecommendationAction })
  targetAction?: RecommendationAction;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ type: Date, default: null })
  lastTriggeredAt?: Date | null;

  @Prop({ type: Number, default: null })
  lastKnownPrice?: number | null;

  @Prop({ type: String, enum: RecommendationAction, default: null })
  lastKnownAction?: RecommendationAction | null;

  @Prop({ default: true })
  notifyEmail!: boolean;
}

export const AlertSchema = SchemaFactory.createForClass(Alert);

AlertSchema.index({ userId: 1, symbol: 1, type: 1 });
AlertSchema.index({ isActive: 1 });
