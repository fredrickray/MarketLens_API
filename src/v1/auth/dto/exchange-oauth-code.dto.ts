import { IsString, MinLength } from 'class-validator';

export class ExchangeOAuthCodeDto {
  @IsString()
  @MinLength(16)
  code!: string;
}
