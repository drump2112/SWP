import { IsString, IsNumber, IsOptional, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateImportBatchDto {
  @Type(() => Number)
  @IsNumber()
  warehouse_id: number;

  @Type(() => Number)
  @IsNumber()
  supplier_id: number;

  @Type(() => Number)
  @IsNumber()
  product_id: number;

  @IsString()
  @MaxLength(50)
  batch_code: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'Số lượng phải >= 0' })
  import_quantity: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'Đơn giá phải >= 0' })
  unit_price: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'Chiết khấu phải >= 0' })
  discount_per_unit?: number;

  @IsOptional()
  @IsString()
  import_date?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  invoice_number?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  vehicle_number?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'VAT phải >= 0' })
  vat_percent?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  environmental_tax_rate?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
