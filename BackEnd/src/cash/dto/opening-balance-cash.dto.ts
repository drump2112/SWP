import { IsNumber, IsOptional, IsString } from 'class-validator';

/**
 * DTO để nhập số dư đầu kỳ cho sổ quỹ tiền mặt
 * Dùng khi khởi tạo hệ thống hoặc điều chỉnh số dư ban đầu
 */
export class OpeningBalanceCashDto {
  @IsNumber()
  storeId: number;

  @IsNumber()
  openingBalance: number; // Số dư mong muốn

  @IsOptional()
  @IsString()
  effectiveDate?: string; // Ngày hiệu lực (mặc định: hôm nay)

  @IsOptional()
  @IsString()
  notes?: string; // Ghi chú
}
