import { IsInt, IsNotEmpty, IsNumber, IsISO8601, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ProductPriceItem {
  @IsInt()
  @IsNotEmpty()
  productId: number;

  @IsNumber()
  @IsNotEmpty()
  price: number;
}

export class SetRegionPricesDto {
  @IsInt()
  @IsNotEmpty()
  regionId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductPriceItem)
  prices: ProductPriceItem[];

  // Hỗ trợ datetime đầy đủ (ISO 8601): 2024-01-15T08:30:00 hoặc 2024-01-15T08:30:00.000Z
  @IsISO8601()
  @IsNotEmpty()
  validFrom: string;

  // Hỗ trợ datetime đầy đủ (ISO 8601): 2024-01-15T23:59:59 hoặc 2024-01-15T23:59:59.000Z
  @IsISO8601()
  @IsOptional()
  validTo?: string;
}
