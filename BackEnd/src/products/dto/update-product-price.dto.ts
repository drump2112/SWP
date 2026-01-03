import { IsNumber, IsDateString, IsOptional } from 'class-validator';

export class UpdateProductPriceDto {
  @IsNumber()
  @IsOptional()
  price?: number;

  @IsDateString()
  @IsOptional()
  validFrom?: string;

  @IsDateString()
  @IsOptional()
  validTo?: string;
}
