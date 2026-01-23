import { IsDateString, IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateOpeningInfoDto {
  @IsDateString()
  @IsOptional()
  shiftDate?: string;

  @IsInt()
  @IsOptional()
  shiftNo?: number;

  @IsString()
  @IsOptional()
  openedAt?: string;

  @IsString()
  @IsOptional()
  handoverName?: string;

  @IsString()
  @IsOptional()
  receiverName?: string;
}
