import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { TimeHorizon } from '../../../core/enums/time-horizon.enum';

export class PredictMarketDataDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsNumber({}, { each: true })
  prices!: number[];

  @IsArray()
  @ArrayMinSize(1)
  @IsNumber({}, { each: true })
  volume!: number[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  timestamps?: string[];
}

export class PredictContextDto {
  @IsOptional()
  @IsEnum(TimeHorizon)
  time_horizon?: TimeHorizon;

  @IsOptional()
  @IsEnum(['low', 'medium', 'high'])
  risk_tolerance?: 'low' | 'medium' | 'high';
}

export class PredictRequestDto {
  @IsString()
  @MinLength(1)
  @MaxLength(16)
  @Matches(/^[A-Za-z0-9.\-^]+$/)
  symbol!: string;

  @ValidateNested()
  @Type(() => PredictMarketDataDto)
  market_data!: PredictMarketDataDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PredictContextDto)
  context?: PredictContextDto;
}
