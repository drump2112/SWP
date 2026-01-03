import { IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';

export class CreatePumpDto {
  @IsNumber()
  storeId: number;

  @IsNumber()
  tankId: number;

  @IsString()
  pumpCode: string;

  @IsString()
  name: string;

  @IsNumber()
  productId: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePumpDto {
  @IsOptional()
  @IsNumber()
  tankId?: number;

  @IsOptional()
  @IsString()
  pumpCode?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  productId?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
