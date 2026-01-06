import { IsInt, IsNotEmpty, IsString, IsDateString, IsArray, ValidateNested, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO cho chi tiết ngăn xe téc
 */
export class TruckCompartmentDto {
  @IsInt()
  @Min(1)
  @Max(7)
  compartmentNumber: number; // Số ngăn: 1-7

  @IsInt()
  productId: number; // Loại xăng dầu trong ngăn này

  @IsNumber()
  @IsOptional()
  compartmentHeight?: number; // Chiều cao téc tại ngăn (cm)

  @IsNumber()
  @IsOptional()
  truckTemperature?: number; // Nhiệt độ tại xe téc (°C)

  @IsNumber()
  @IsOptional()
  truckVolume?: number; // Thể tích tại nhiệt độ xe téc (lít)

  @IsNumber()
  @IsOptional()
  warehouseHeight?: number; // Chiều cao téc tại kho (cm)

  @IsNumber()
  @IsOptional()
  actualTemperature?: number; // Nhiệt độ thực tế (°C)

  @IsNumber()
  @IsOptional()
  actualVolume?: number; // Thể tích tại nhiệt độ thực tế (lít)

  @IsNumber()
  @IsOptional()
  receivedVolume?: number; // Lượng thực nhận (lít)

  @IsNumber()
  @IsOptional()
  heightLossTruck?: number; // Hao hụt chiều cao đo đạc tại xe (cm)

  @IsNumber()
  @IsOptional()
  heightLossWarehouse?: number; // Hao hụt chiều cao téc tại kho (cm)
}

/**
 * DTO mở rộng cho phiếu nhập kho xăng dầu với xe téc
 */
export class CreateInventoryDocumentWithTruckDto {
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
  @IsNotEmpty()
  licensePlate: string; // Biển số xe téc - bắt buộc

  @IsString()
  @IsOptional()
  driverName?: string; // Tên tài xế

  @IsString()
  @IsOptional()
  driverPhone?: string; // SĐT tài xế

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TruckCompartmentDto)
  compartments: TruckCompartmentDto[]; // Chi tiết từng ngăn xe téc (tối đa 7 ngăn)

  @IsString()
  @IsOptional()
  notes?: string; // Ghi chú
}

/**
 * Response DTO cho phiếu nhập kho với tính toán
 */
export class InventoryDocumentWithCalculationResponseDto {
  id: number;
  docDate: string;
  docType: string;
  supplierName: string;
  invoiceNumber: string;
  licensePlate: string;
  status: string;

  compartments: {
    compartmentNumber: number;
    productName: string;
    productCode: string;
    truckVolume: number;
    actualVolume: number;
    receivedVolume: number;
    lossVolume: number;
    truckTemperature: number;
    actualTemperature: number;
    compartmentHeight: number;
    warehouseHeight: number;
    heightLossTruck: number;
    heightLossWarehouse: number;
  }[];

  calculation: {
    expansionCoefficient: number;
    lossCoefficient: number;
    totalTruckVolume: number;
    totalActualVolume: number;
    totalReceivedVolume: number;
    totalLossVolume: number;
    allowedLossVolume: number;
    excessShortageVolume: number;
    temperatureAdjustmentVolume: number;
    status: 'NORMAL' | 'EXCESS' | 'SHORTAGE'; // Bình thường / Thừa / Thiếu
  };
}
