import { IsNotEmpty, IsDateString, IsInt, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateShiftDebtSaleDto, CreateReceiptDto, CreateCashDepositDto } from './shift-operations.dto';

class PumpReadingDto {
  @IsNotEmpty()
  pumpCode: string;

  @IsInt()
  productId: number;

  @IsNotEmpty()
  startValue: number;

  @IsNotEmpty()
  endValue: number;
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
}
