import { IsEnum, IsOptional } from 'class-validator';
import { TimeHorizon } from '../../../core/enums/time-horizon.enum';

export class AnalysisQueryDto {
  @IsOptional()
  @IsEnum(TimeHorizon)
  time_horizon?: TimeHorizon;

  @IsOptional()
  @IsEnum(['low', 'medium', 'high'])
  risk_tolerance?: 'low' | 'medium' | 'high';
}
