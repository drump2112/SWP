import { IsString, IsNumber, IsOptional, MaxLength, Min } from 'class-validator';

export class UpdateImportBatchDto {
  @IsOptional()
  @IsNumber()
  warehouse_id?: number;

  @IsOptional()
  @IsNumber()
  supplier_id?: number;

  @IsOptional()
  @IsNumber()
  product_id?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  batch_code?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  import_quantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unit_price?: number;

  @IsOptional()
  @IsNumber()
  discount_percent?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  invoice_number?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  vehicle_number?: string;

  @IsOptional()
  @IsNumber()
  vat_percent?: number;

  @IsOptional()
  @IsNumber()
  environmental_tax_rate?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
