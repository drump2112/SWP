import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  IsDateString,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateShiftDebtSaleDto {
  @IsOptional()
  @IsNumber()
  id?: number;

  @IsNotEmpty()
  @IsNumber()
  shiftId: number;

  @IsNotEmpty()
  @IsNumber()
  customerId: number;

  @IsNotEmpty()
  @IsNumber()
  productId: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  quantity: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

// DTO cho phiếu thu tiền (thanh toán nợ)
export class CreateReceiptDto {
  @IsOptional()
  @IsNumber()
  id?: number;

  @IsNotEmpty()
  @IsNumber()
  storeId: number;

  @IsOptional()
  @IsNumber()
  shiftId?: number;

  @IsNotEmpty()
  @IsString()
  receiptType: string; // 'DEBT_COLLECTION', 'ADVANCE', etc.

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  amount: number;

  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceiptDetailDto)
  details: ReceiptDetailDto[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string; // 'CASH', 'BANK_TRANSFER'
}

export class ReceiptDetailDto {
  @IsNotEmpty()
  @IsNumber()
  customerId: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  amount: number;
}

export class CreateCashDepositDto {
  @IsOptional()
  @IsNumber()
  id?: number;

  @IsNotEmpty()
  @IsNumber()
  storeId: number;

  @IsOptional()
  @IsNumber()
  shiftId?: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  amount: number;

  @IsNotEmpty()
  depositDate: string;

  @IsOptional()
  @IsString()
  depositTime?: string;

  @IsOptional()
  @IsString()
  receiverName?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string; // 'CASH', 'BANK_TRANSFER'

  @IsOptional()
  @IsString()
  sourceType?: string; // 'RETAIL' (từ bán lẻ) hoặc 'RECEIPT' (từ phiếu thu)
}
