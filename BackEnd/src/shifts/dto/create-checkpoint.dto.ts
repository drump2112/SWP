import {
  IsNotEmpty,
  IsDateString,
  IsInt,
  IsArray,
  ValidateNested,
  IsOptional,
  IsNumber,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';

// DTO cho số đồng hồ vòi bơm tại checkpoint
class CheckpointReadingDto {
  @IsOptional()
  @IsInt()
  pumpId?: number;

  @IsOptional()
  @IsString()
  pumpCode?: string;

  @IsInt()
  productId: number;

  @IsNumber()
  meterValue: number;
}

// DTO cho tồn kho bể tại checkpoint
class CheckpointStockDto {
  @IsInt()
  tankId: number;

  @IsOptional()
  @IsInt()
  productId?: number;

  @IsOptional()
  @IsNumber()
  systemQuantity?: number;

  @IsNumber()
  actualQuantity: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

// DTO để tạo checkpoint mới
export class CreateCheckpointDto {
  @IsDateString()
  @IsNotEmpty()
  checkpointAt: string; // Thời điểm kiểm kê

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckpointReadingDto)
  readings: CheckpointReadingDto[]; // Số đồng hồ các vòi

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckpointStockDto)
  stocks: CheckpointStockDto[]; // Tồn thực tế các bể
}
