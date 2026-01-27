import { IsNotEmpty, IsDateString } from 'class-validator';

export class UpdateShiftTimesDto {
  @IsNotEmpty()
  @IsDateString()
  openedAt: string; // ISO 8601 format datetime string

  @IsNotEmpty()
  @IsDateString()
  closedAt: string; // ISO 8601 format datetime string
}
