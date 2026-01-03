import { IsInt, IsNotEmpty, IsNumber, IsDateString, IsOptional, IsArray, ValidateNested } from 'class-validator';
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

  @IsDateString()
  @IsNotEmpty()
  validFrom: string;

  @IsDateString()
  @IsOptional()
  validTo?: string;
}
