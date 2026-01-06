import { IsNumber, IsString, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

class InitialStockItem {
  @IsNumber()
  tankId: number;

  @IsNumber()
  productId: number;

  @IsNumber()
  quantity: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO để    cho cửa hàng
 * Dùng khi setup ban đầu hoặc điều chỉnh tồn kho
 */
export class InitialStockDto {
  @IsNumber()
  storeId: number;

  @IsString()
  effectiveDate: string; // Ngày bắt đầu tính tồn

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InitialStockItem)
  items: InitialStockItem[];

  @IsOptional()
  @IsString()
  notes?: string;
}
