import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  /**
   * GET /analytics/overview
   * Tổng quan tất cả metrics quan trọng cho dashboard
   * - Tổng doanh thu, số lượng giao dịch, khách hàng công nợ
   * - So sánh với kỳ trước
   */
  @Get('overview')
  @Roles('SALES', 'ACCOUNTING', 'DIRECTOR', 'ADMIN')
  async getOverview(
    @CurrentUser() user: any,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.analyticsService.getOverview({
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
    });
  }

  /**
   * GET /analytics/revenue/monthly
   * Doanh thu theo tháng (6-12 tháng gần nhất)
   * Dùng để vẽ biểu đồ line/bar chart
   */
  @Get('revenue/monthly')
  @Roles('SALES', 'ACCOUNTING', 'DIRECTOR', 'ADMIN')
  async getMonthlyRevenue(
    @Query('months') months?: string, // Số tháng lấy về (default: 6)
    @Query('storeId') storeId?: string, // Filter theo cửa hàng
  ) {
    return this.analyticsService.getMonthlyRevenue(
      months ? +months : 6,
      storeId ? +storeId : undefined,
    );
  }

  /**
   * GET /analytics/revenue/by-store
   * So sánh doanh thu giữa các cửa hàng
   * Theo khoảng thời gian cụ thể
   */
  @Get('revenue/by-store')
  @Roles('SALES', 'ACCOUNTING', 'DIRECTOR', 'ADMIN')
  async getRevenueByStore(
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    return this.analyticsService.getRevenueByStore(
      new Date(fromDate),
      new Date(toDate),
    );
  }

  /**
   * GET /analytics/revenue/store-trends
   * Xu hướng doanh thu của từng cửa hàng qua các tháng
   * Dùng để vẽ multi-line chart
   */
  @Get('revenue/store-trends')
  @Roles('SALES', 'ACCOUNTING', 'DIRECTOR', 'ADMIN')
  async getStoreTrends(
    @Query('months') months?: string,
  ) {
    return this.analyticsService.getStoreTrends(months ? +months : 6);
  }

  /**
   * GET /analytics/inventory/total
   * Tổng giá trị hàng tồn kho của toàn hệ thống
   * Chia theo từng chi nhánh/kho
   */
  @Get('inventory/total')
  @Roles('SALES', 'ACCOUNTING', 'DIRECTOR', 'ADMIN')
  async getTotalInventory() {
    return this.analyticsService.getTotalInventoryValue();
  }

  /**
   * GET /analytics/inventory/by-product
   * Top sản phẩm tồn kho nhiều nhất
   */
  @Get('inventory/by-product')
  @Roles('SALES', 'ACCOUNTING', 'DIRECTOR', 'ADMIN')
  async getInventoryByProduct(
    @Query('limit') limit?: string,
  ) {
    return this.analyticsService.getInventoryByProduct(limit ? +limit : 10);
  }

  /**
   * GET /analytics/sales/top-products
   * Top sản phẩm bán chạy nhất
   */
  @Get('sales/top-products')
  @Roles('SALES', 'ACCOUNTING', 'DIRECTOR', 'ADMIN')
  async getTopProducts(
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
    @Query('limit') limit?: string,
  ) {
    return this.analyticsService.getTopProducts(
      new Date(fromDate),
      new Date(toDate),
      limit ? +limit : 10,
    );
  }

  /**
   * GET /analytics/debt/summary
   * Tổng quan công nợ toàn hệ thống
   */
  @Get('debt/summary')
  @Roles('SALES', 'ACCOUNTING', 'DIRECTOR', 'ADMIN')
  async getDebtSummary() {
    return this.analyticsService.getDebtSummary();
  }

  /**
   * GET /analytics/performance/stores
   * Hiệu suất hoạt động của các cửa hàng
   * - Doanh thu, số ca, số giao dịch
   */
  @Get('performance/stores')
  @Roles('SALES', 'ACCOUNTING', 'DIRECTOR', 'ADMIN')
  async getStorePerformance(
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    return this.analyticsService.getStorePerformance(
      new Date(fromDate),
      new Date(toDate),
    );
  }

  /**
   * GET /analytics/sales/quantity-by-store
   * Sản lượng bán theo cửa hàng và sản phẩm
   * Trả về ma trận: cửa hàng x sản phẩm
   */
  @Get('sales/quantity-by-store')
  @Roles('SALES', 'ACCOUNTING', 'DIRECTOR', 'ADMIN')
  async getQuantityByStoreAndProduct(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.analyticsService.getQuantityByStoreAndProduct(
      fromDate ? new Date(fromDate) : new Date(new Date().setDate(1)),
      toDate ? new Date(toDate) : new Date(),
    );
  }
}
