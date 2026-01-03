import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  /**
   * GET /reports/debt?storeId=1&fromDate=2024-01-01&toDate=2024-12-31
   * Báo cáo công nợ chi tiết theo khách hàng
   * - Kế toán/Admin: Bỏ storeId để xem tất cả
   * - Cửa hàng: Phải truyền storeId
   */
  @Get('debt')
  @Roles('SALES', 'ACCOUNTING', 'DIRECTOR', 'ADMIN')
  getDebtReport(
    @Query('storeId') storeId?: string,
    @Query('customerId') customerId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.reportsService.getDebtReport({
      storeId: storeId ? +storeId : undefined,
      customerId: customerId ? +customerId : undefined,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
    });
  }

  /**
   * GET /reports/shift/:shiftId
   * Báo cáo chi tiết ca làm việc
   */
  @Get('shift/:shiftId')
  @Roles('SALES', 'ACCOUNTING', 'DIRECTOR', 'ADMIN')
  getShiftDetailReport(@Param('shiftId') shiftId: string) {
    return this.reportsService.getShiftDetailReport(+shiftId);
  }

  @Get('sales')
  @Roles('SALES', 'ACCOUNTING', 'DIRECTOR', 'ADMIN')
  getSalesReport(
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
    @Query('storeId') storeId?: string,
  ) {
    return this.reportsService.getSalesReport(
      new Date(fromDate),
      new Date(toDate),
      storeId ? +storeId : undefined,
    );
  }

  @Get('cash')
  @Roles('ACCOUNTING', 'DIRECTOR', 'ADMIN')
  getCashReport(@Query('storeId') storeId?: string) {
    return this.reportsService.getCashReport(storeId ? +storeId : undefined);
  }

  @Get('inventory')
  @Roles('SALES', 'ACCOUNTING', 'DIRECTOR', 'ADMIN')
  getInventoryReport(@Query('warehouseId') warehouseId?: string) {
    return this.reportsService.getInventoryReport(warehouseId ? +warehouseId : undefined);
  }

  @Get('dashboard')
  @Roles('DIRECTOR', 'ADMIN')
  getDashboard(
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    return this.reportsService.getDashboard(
      new Date(fromDate),
      new Date(toDate),
    );
  }
}
