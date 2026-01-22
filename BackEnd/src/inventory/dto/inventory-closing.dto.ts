import { IsNotEmpty, IsNumber, IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateInventoryClosingDto {
  @IsNotEmpty()
  @IsNumber()
  storeId: number;

  @IsNotEmpty()
  @IsDateString()
  periodFrom: string;

  @IsNotEmpty()
  @IsDateString()
  periodTo: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class InventoryClosingItemDto {
  tankId: number;
  tankCode: string;
  tankName: string;
  productId: number;
  productName: string;
  productCategory: string;
  openingBalance: number;
  importQuantity: number;
  exportQuantity: number;
  lossRate: number;
  lossAmount: number;
  closingBalance: number;
  lossConfigId?: number | null;
}

export class InventoryClosingPreviewDto {
  storeId: number;
  storeName: string;
  periodFrom: string;
  periodTo: string;
  items: InventoryClosingItemDto[];
}

export class InventoryClosingQueryDto {
  @IsOptional()
  @IsNumber()
  storeId?: number;

  @IsOptional()
  @IsNumber()
  tankId?: number;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;
}
