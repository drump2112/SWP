import { IsInt, IsNotEmpty, IsString, IsDateString, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

class InventoryItemDto {
  @IsInt()
  productId: number;

  @IsNotEmpty()
  quantity: number;

  @IsNotEmpty()
  unitPrice: number;

  @IsInt()
  @IsOptional()
  tankId?: number;
}

export class CreateInventoryDocumentDto {
  @IsInt()
  @IsOptional()
  warehouseId?: number;

  @IsInt()
  @IsOptional()
  storeId?: number;

  @IsString()
  @IsNotEmpty()
  docType: string; // IMPORT, EXPORT, TRANSFER, ADJUST

  @IsDateString()
  @IsNotEmpty()
  docDate: string;

  @IsString()
  @IsOptional()
  supplierName?: string;

  @IsString()
  @IsOptional()
  invoiceNumber?: string;

  @IsString()
  @IsOptional()
  licensePlate?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InventoryItemDto)
  items: InventoryItemDto[];
}
