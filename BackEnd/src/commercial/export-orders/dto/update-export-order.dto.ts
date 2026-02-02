import { IsNumber, IsOptional, IsString, IsDateString, MaxLength } from 'class-validator';

export class UpdateExportOrderDto {
  @IsOptional()
  @IsNumber()
  customer_id?: number;

  @IsOptional()
  @IsNumber()
  warehouse_id?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  order_number?: string;

  @IsOptional()
  @IsDateString()
  order_date?: string;

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
}
