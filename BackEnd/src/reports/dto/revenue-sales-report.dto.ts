import { IsOptional, IsNumber, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Query DTO cho báo cáo doanh thu/xuất hàng
 * - Không có filter khách hàng (báo cáo khách hàng sẽ ở tab riêng)
 * - Filter thời gian có thể chọn giờ/phút/giây
 * - Kỳ giá: Khi chọn từ dropdown, frontend sẽ set fromDateTime/toDateTime
 */
export class RevenueSalesReportQueryDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  productId?: number; // Lọc theo mặt hàng

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  storeId?: number; // Lọc theo cửa hàng

  @IsOptional()
  @IsDateString()
  fromDateTime?: string; // Thời gian bắt đầu (có thể chọn giờ/phút/giây)

  @IsOptional()
  @IsDateString()
  toDateTime?: string; // Thời gian kết thúc (có thể chọn giờ/phút/giây)
}

/**
 * Chi tiết mặt hàng trong cửa hàng
 */
export interface ProductDetail {
  productId: number;
  productCode: string;
  productName: string;
  quantity: number;
  amount: number;
}

/**
 * Chi tiết cửa hàng
 */
export interface StoreDetail {
  storeId: number;
  storeCode: string;
  storeName: string;
  totalQuantity: number;
  totalAmount: number;
  products: ProductDetail[];
}

/**
 * Kỳ giá để hiển thị trong dropdown
 */
export interface PricePeriod {
  priceId: number;
  productId: number;
  productCode: string;
  productName: string;
  validFrom: Date;
  validTo: Date | null;
  price: number;
  label: string; // "Xăng RON95: 01/01/2025 15:00 -> 08/01/2025 15:00"
}

/**
 * Response chính - Đơn giản: Cửa hàng -> Mặt hàng
 */
export interface RevenueSalesReportResponse {
  stores: StoreDetail[];
  summary: {
    totalQuantity: number;
    totalAmount: number;
  };
}

// ========== BÁO CÁO THEO KHÁCH HÀNG ==========

/**
 * Query DTO cho báo cáo doanh thu theo khách hàng
 */
export class SalesByCustomerReportQueryDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  customerId?: number; // Lọc theo khách hàng

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  storeId?: number; // Lọc theo cửa hàng

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  productId?: number; // Lọc theo mặt hàng

  @IsOptional()
  @IsDateString()
  fromDateTime?: string; // Thời gian bắt đầu

  @IsOptional()
  @IsDateString()
  toDateTime?: string; // Thời gian kết thúc
}

/**
 * Chi tiết mặt hàng trong khách hàng
 */
export interface CustomerProductDetail {
  productId: number;
  productCode: string;
  productName: string;
  quantity: number;
  amount: number;
}

/**
 * Chi tiết khách hàng
 */
export interface CustomerDetail {
  customerId: number;
  customerCode: string;
  customerName: string;
  totalQuantity: number;
  totalAmount: number;
  products: CustomerProductDetail[];
}

/**
 * Response báo cáo theo khách hàng
 */
export interface SalesByCustomerReportResponse {
  customers: CustomerDetail[];
  summary: {
    totalQuantity: number;
    totalAmount: number;
  };
}

/**
 * Query DTO cho báo cáo theo ca (shift report)
 */
export class SalesByShiftReportQueryDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  storeId?: number; // Lọc theo cửa hàng (bắt buộc)

  @IsOptional()
  @IsDateString()
  fromDate?: string; // Ngày bắt đầu

  @IsOptional()
  @IsDateString()
  toDate?: string; // Ngày kết thúc
}
