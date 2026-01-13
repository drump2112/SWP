import { IsNotEmpty, IsNumber, IsOptional, IsString, IsDateString } from 'class-validator';

export class ImportOpeningBalanceItemDto {
  @IsNotEmpty()
  @IsString()
  customerCode: string; // Mã khách hàng

  @IsNotEmpty()
  @IsNumber()
  openingBalance: number; // Số dư đầu kỳ (dương = khách nợ)

  @IsOptional()
  @IsString()
  description?: string; // Mô tả (tùy chọn)
}

export class ImportOpeningBalanceDto {
  @IsNotEmpty()
  @IsNumber()
  storeId: number; // Cửa hàng

  @IsNotEmpty()
  @IsDateString()
  transactionDate: string; // Ngày ghi nhận số dư đầu kỳ

  @IsNotEmpty()
  items: ImportOpeningBalanceItemDto[]; // Danh sách khách hàng
}

export interface ImportOpeningBalanceResponseDto {
  success: number; // Số record thành công
  failed: number; // Số record thất bại
  errors: { row: number; customerCode: string; message: string }[]; // Chi tiết lỗi
  debtLedgerIds: number[]; // Danh sách ID của debt_ledger đã tạo
}
