import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { RecommendationAction } from '../../../core/enums/recommendation-action.enum';
import { TimeHorizon } from '../../../core/enums/time-horizon.enum';
import { MlServiceMode } from '../../../core/enums/ml-mode.enum';

export type RecommendationAuditDocument = HydratedDocument<RecommendationAudit>;

@Schema({ timestamps: true, collection: 'recommendation_audits' })
export class RecommendationAudit {
  @Prop({ required: true, uppercase: true, trim: true, index: true })
  symbol!: string;

  @Prop({ type: String, default: null, index: true })
  userId?: string | null;

  @Prop({ required: true, enum: RecommendationAction })
  finalAction!: RecommendationAction;

  @Prop({ required: true, enum: RecommendationAction })
  rawAction!: RecommendationAction;

  @Prop({ required: true, min: 0, max: 1 })
  finalConfidence!: number;

  @Prop({ required: true, min: 0, max: 1 })
  rawConfidence!: number;

  @Prop({ type: String, default: null })
  modelVersion?: string | null;

  @Prop({ required: true, enum: MlServiceMode })
  mlMode!: MlServiceMode;

  @Prop({ type: String, default: null })
  timeHorizon?: TimeHorizon | null;

  @Prop({ type: String, enum: ['low', 'medium', 'high'], default: null })
  riskTolerance?: 'low' | 'medium' | 'high' | null;

  @Prop({ type: [String], default: [] })
  rulesApplied!: string[];

  @Prop({ type: [String], default: [] })
  warnings!: string[];

  @Prop({ default: false })
  wasCached!: boolean;

  @Prop({ required: true })
  marketProvider!: string;

  @Prop({ default: false })
  isInformationalOnly!: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export const RecommendationAuditSchema =
  SchemaFactory.createForClass(RecommendationAudit);

RecommendationAuditSchema.index({ symbol: 1, createdAt: -1 });
RecommendationAuditSchema.index({ userId: 1, createdAt: -1 });
