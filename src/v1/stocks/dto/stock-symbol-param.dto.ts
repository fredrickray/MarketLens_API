import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class StockSymbolParamDto {
  @IsString()
  @MinLength(1)
  @MaxLength(16)
  @Matches(/^[A-Za-z0-9.\-^]+$/)
  symbol!: string;
}
