import { IsInt, IsNotEmpty, IsNumber, IsString, IsArray, ValidateNested, IsOptional, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

class ReceiptDetailDto {
  @IsInt()
  customerId: number;

  @IsNumber()
  amount: number;
}

export class CreateReceiptDto {
  @IsInt()
  @IsNotEmpty()
  storeId: number;

  @IsInt()
  @IsOptional()
  shiftId?: number;

  @IsString()
  @IsNotEmpty()
  receiptType: string; // CASH_SALES, DEBT_PAYMENT

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceiptDetailDto)
  @IsOptional()
  details?: ReceiptDetailDto[];

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  paymentMethod?: string; // 'CASH', 'BANK_TRANSFER'

  @IsString()
  @IsOptional()
  receiptAt?: string; // ISO datetime string
}
