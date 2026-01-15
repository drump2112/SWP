import { IsNotEmpty, IsDateString, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateShiftDto {
  @IsInt()
  @IsNotEmpty()
  storeId: number;

  @IsDateString()
  @IsNotEmpty()
  shiftDate: string;

  @IsInt()
  @IsNotEmpty()
  shiftNo: number;

  @IsString()
  @IsOptional()
  openedAt?: string;

  @IsString()
  @IsOptional()
  handoverName?: string; // Tên người giao ca

  @IsString()
  @IsOptional()
  receiverName?: string; // Tên người nhận ca
}
