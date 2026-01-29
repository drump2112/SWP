import { IsNumber, IsOptional, IsString, IsArray } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class TankDataDto {
  @IsNumber()
  tankId: number;

  @IsString()
  tankCode: string;

  @IsString()
  productName: string;

  @IsNumber()
  @IsOptional()
  heightTotal?: number;

  @IsNumber()
  @IsOptional()
  heightWater?: number;

  @IsNumber()
  @IsOptional()
  actualStock?: number;

  @IsNumber()
  @IsOptional()
  bookStock?: number;

  @IsNumber()
  @IsOptional()
  difference?: number;
}

export class PumpDataDto {
  @IsNumber()
  pumpId: number;

  @IsString()
  pumpCode: string;

  @IsNumber()
  @IsOptional()
  tankId?: number; // ✅ Tank mà vòi bơm này gắn vào

  @IsNumber()
  @IsOptional()
  meterReading?: number;
}

export class CreateInventoryCheckDto {
  @IsNumber()
  storeId: number;

  @IsNumber()
  @IsOptional()
  shiftId?: number;

  @IsString()
  @IsOptional()
  checkAt?: string;

  @IsString()
  @IsOptional()
  member1Name?: string;

  @IsString()
  @IsOptional()
  member2Name?: string;

  @IsArray()
  @IsOptional()
  tankData?: TankDataDto[];

  @IsArray()
  @IsOptional()
  pumpData?: PumpDataDto[];

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  conclusion?: string;

  @IsNumber()
  @IsOptional()
  totalDifference?: number;

  @IsString()
  @IsOptional()
  status?: string;
}

export class InventoryCheckQueryDto {
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  storeId?: number;

  @IsString()
  @IsOptional()
  fromDate?: string;

  @IsString()
  @IsOptional()
  toDate?: string;

  @IsString()
  @IsOptional()
  status?: string;
}
