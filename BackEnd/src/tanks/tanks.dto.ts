import { IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';

export class CreateTankDto {
  @IsNumber()
  storeId: number;

  @IsString()
  tankCode: string;

  @IsString()
  name: string;

  @IsNumber()
  capacity: number;

  @IsNumber()
  productId: number;

  @IsOptional()
  @IsNumber()
  currentStock?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateTankDto {
  @IsOptional()
  @IsString()
  tankCode?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  capacity?: number;

  @IsOptional()
  @IsNumber()
  productId?: number;

  @IsOptional()
  @IsNumber()
  currentStock?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
