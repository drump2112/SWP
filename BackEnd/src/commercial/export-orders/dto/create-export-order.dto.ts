import { IsNumber, IsOptional, IsString, IsArray, ValidateNested, IsDateString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ExportOrderItemDto {
  @IsNumber()
  customer_id: number;

  @IsNumber()
  batch_id: number;

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsNumber()
  @Min(0)
  unit_price: number;

  @IsOptional()
  @IsNumber()
  discount_percent?: number;

  @IsOptional()
  @IsNumber()
  discount_amount?: number;
}

export class CreateExportOrderDto {
  @IsOptional()
  @IsNumber({}, { message: 'warehouse_id must be a valid number' })
  warehouse_id?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  order_number?: string;

  @IsOptional()
  @IsDateString()
  order_date?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  vehicle_number?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  driver_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  driver_phone?: string;

  @IsOptional()
  @IsNumber()
  vat_percent?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  payment_method?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  payment_status?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExportOrderItemDto)
  items: ExportOrderItemDto[];
}
