import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { AlertType } from '../../../core/enums/alert-type.enum';
import { RecommendationAction } from '../../../core/enums/recommendation-action.enum';

export class CreateAlertDto {
  @IsString()
  @MinLength(1)
  @MaxLength(16)
  @Matches(/^[A-Za-z0-9.\-^]+$/)
  symbol!: string;

  @IsEnum(AlertType)
  type!: AlertType;

  @ValidateIf((o: CreateAlertDto) =>
    [AlertType.PRICE_ABOVE, AlertType.PRICE_BELOW].includes(o.type),
  )
  @IsNumber()
  @IsPositive()
  targetPrice?: number;

  @ValidateIf((o: CreateAlertDto) => o.type === AlertType.PRICE_CHANGE_PERCENT)
  @IsNumber()
  @Min(0.1)
  @Max(100)
  thresholdPercent?: number;

  @ValidateIf((o: CreateAlertDto) => o.type === AlertType.RECOMMENDATION_CHANGE)
  @IsOptional()
  @IsEnum(RecommendationAction)
  targetAction?: RecommendationAction;
}
