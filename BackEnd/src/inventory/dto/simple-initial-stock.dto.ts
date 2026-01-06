import { IsNumber, IsArray, ValidateNested, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Item tồn đầu đơn giản: chỉ cần productId + quantity
 * KHÔNG cần tankId
 */
class SimpleStockItem {
  @IsNumber()
  productId: number;

  @IsNumber()
  quantity: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO nhập tồn đầu theo cửa hàng + mặt hàng
 * Đơn giản, không quản lý theo tank
 */
export class SimpleInitialStockDto {
  @IsNumber()
  storeId: number;

  @IsOptional()
  @IsString()
  effectiveDate?: string; // Mặc định hôm nay

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SimpleStockItem)
  items: SimpleStockItem[];

  @IsOptional()
  @IsString()
  notes?: string;
}
