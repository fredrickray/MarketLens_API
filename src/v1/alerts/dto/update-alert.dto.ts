import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateAlertDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
