import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { RecommendationAction } from '../../../core/enums/recommendation-action.enum';

export class PredictResponseDto {
  @IsString()
  symbol!: string;

  @IsEnum(RecommendationAction)
  action!: RecommendationAction;

  @IsNumber()
  @Min(0)
  @Max(1)
  confidence!: number;

  @IsString()
  explanation!: string;

  @IsOptional()
  @IsString()
  model_version?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features_used?: string[];
}
