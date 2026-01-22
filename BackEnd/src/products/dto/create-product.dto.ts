import { IsString, IsBoolean, IsOptional, IsEnum } from 'class-validator';
import { ProductCategory } from '../../entities/product.entity';

export class CreateProductDto {
  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsBoolean()
  @IsOptional()
  isFuel?: boolean;

  @IsEnum(ProductCategory)
  @IsOptional()
  category?: ProductCategory;
}
