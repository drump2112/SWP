import { IsInt, IsNotEmpty, IsNumber, IsDateString, IsOptional } from 'class-validator';

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

  @IsDateString()
  @IsNotEmpty()
  validFrom: string;

  @IsDateString()
  @IsOptional()
  validTo?: string;
}
