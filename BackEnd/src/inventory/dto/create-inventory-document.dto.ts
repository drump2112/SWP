import { IsInt, IsNotEmpty, IsString, IsDateString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class InventoryItemDto {
  @IsInt()
  productId: number;

  @IsNotEmpty()
  quantity: number;

  @IsNotEmpty()
  unitPrice: number;
}

export class CreateInventoryDocumentDto {
  @IsInt()
  @IsNotEmpty()
  warehouseId: number;

  @IsString()
  @IsNotEmpty()
  docType: string; // IMPORT, EXPORT, TRANSFER, ADJUST

  @IsDateString()
  @IsNotEmpty()
  docDate: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InventoryItemDto)
  items: InventoryItemDto[];
}
