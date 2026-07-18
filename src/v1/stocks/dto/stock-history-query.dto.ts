import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class StockHistoryQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(365)
  days?: number;
}
