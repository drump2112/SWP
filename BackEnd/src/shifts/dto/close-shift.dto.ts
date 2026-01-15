import {
  IsNotEmpty,
  IsDateString,
  IsInt,
  IsArray,
  ValidateNested,
  IsOptional,
  IsNumber,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  CreateShiftDebtSaleDto,
  CreateReceiptDto,
  CreateCashDepositDto,
} from './shift-operations.dto';

class PumpReadingDto {
  @IsNotEmpty()
  pumpCode: string;

  @IsInt()
  productId: number;

  @IsNotEmpty()
  startValue: number;

  @IsNotEmpty()
  endValue: number;

  @IsOptional()
  @IsNumber()
  testExport?: number; // Xuất kiểm thử / Quay kho
}

class ExpenseDto {
  @IsOptional()
  @IsNumber()
  id?: number;

  @IsInt()
  expenseCategoryId: number;

  @IsNumber()
  amount: number;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string; // CASH, BANK_TRANSFER
}

class InventoryImportDto {
  @IsNotEmpty()
  @IsDateString()
  docDate: string;

  @IsOptional()
  @IsString()
  supplierName?: string;

  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @IsNotEmpty()
  @IsString()
  licensePlate: string;

  @IsOptional()
  @IsString()
  driverName?: string;

  @IsNotEmpty()
  @IsInt()
  productId: number;

  @IsNotEmpty()
  @IsNumber()
  quantity: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

class InventoryExportDto {
  @IsNotEmpty()
  @IsDateString()
  docDate: string;

  @IsOptional()
  @IsString()
  supplierName?: string;

  @IsNotEmpty()
  @IsInt()
  productId: number;

  @IsNotEmpty()
  @IsNumber()
  quantity: number;

  @IsNotEmpty()
  @IsNumber()
  unitPrice: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CloseShiftDto {
  @IsInt()
  @IsNotEmpty()
  shiftId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PumpReadingDto)
  pumpReadings: PumpReadingDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateShiftDebtSaleDto)
  debtSales?: CreateShiftDebtSaleDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateReceiptDto)
  receipts?: CreateReceiptDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCashDepositDto)
  deposits?: CreateCashDepositDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExpenseDto)
  expenses?: ExpenseDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InventoryImportDto)
  inventoryImports?: InventoryImportDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InventoryExportDto)
  inventoryExports?: InventoryExportDto[];

  @IsOptional()
  @IsDateString()
  closedAt?: string;

  @IsOptional()
  @IsString()
  handoverName?: string; // Tên người giao ca

  @IsOptional()
  @IsString()
  receiverName?: string; // Tên người nhận ca
}
