import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { TimeHorizon } from '../../../core/enums/time-horizon.enum';

@Schema({ _id: false })
export class UserPreferences {
  @Prop({ type: String, enum: TimeHorizon, default: TimeHorizon.MEDIUM })
  timeHorizon!: TimeHorizon;

  @Prop({
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium',
  })
  riskTolerance!: 'low' | 'medium' | 'high';
}

export const UserPreferencesSchema =
  SchemaFactory.createForClass(UserPreferences);
