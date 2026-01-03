import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class DebtSaleItemDto {
  @IsInt()
  productId: number;

  @IsNumber()
  quantity: number;

  @IsNumber()
  unitPrice: number;
}

export class CreateDebtSaleDto {
  @IsInt()
  @IsNotEmpty()
  customerId: number;

  @IsInt()
  @IsNotEmpty()
  storeId: number;

  @IsInt()
  @IsOptional()
  shiftId?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DebtSaleItemDto)
  items: DebtSaleItemDto[];
}
