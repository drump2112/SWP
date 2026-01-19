import { IsInt, IsNotEmpty, IsNumber, IsISO8601, IsOptional } from 'class-validator';

export class CreateProductPriceDto {
  @IsInt()
  @IsNotEmpty()
  productId: number;

  @IsInt()
  @IsNotEmpty()
  regionId: number;

  @IsNumber()
  @IsNotEmpty()
  price: number;

  // Hỗ trợ datetime đầy đủ (ISO 8601): 2024-01-15T08:30:00 hoặc 2024-01-15T08:30:00.000Z
  @IsISO8601()
  @IsNotEmpty()
  validFrom: string;

  // Hỗ trợ datetime đầy đủ (ISO 8601): 2024-01-15T23:59:59 hoặc 2024-01-15T23:59:59.000Z
  @IsISO8601()
  @IsOptional()
  validTo?: string;
}
