import { IsNotEmpty, IsNumber, IsString, IsOptional, IsDateString, IsEnum } from 'class-validator';
import { ProductCategory } from '../../entities/product.entity';

export class CreateLossConfigDto {
  @IsNotEmpty()
  @IsNumber()
  storeId: number;

  @IsNotEmpty()
  @IsEnum(ProductCategory)
  productCategory: ProductCategory;

  @IsNotEmpty()
  @IsNumber()
  lossRate: number;

  @IsNotEmpty()
  @IsDateString()
  effectiveFrom: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateLossConfigDto {
  @IsOptional()
  @IsEnum(ProductCategory)
  productCategory?: ProductCategory;

  @IsOptional()
  @IsNumber()
  lossRate?: number;

  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
