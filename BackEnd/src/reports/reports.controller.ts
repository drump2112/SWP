import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  /**
   * GET /reports/debt?storeId=1&fromDate=2024-01-01&toDate=2024-12-31
   * Báo cáo công nợ chi tiết theo khách hàng
   * - Kế toán/Admin/Sales/Director: Xem tất cả hoặc filter theo storeId
   * - Cửa hàng (STORE): Chỉ xem công nợ của cửa hàng mình
   */
  @Get('debt')
  @Roles('STORE', 'SALES', 'ACCOUNTING', 'DIRECTOR', 'ADMIN')
  getDebtReport(
    @CurrentUser() user: any,
    @Query('storeId') storeId?: string,
    @Query('customerId') customerId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    // Nếu user là STORE, tự động lấy storeId của user
    const effectiveStoreId = user.roleCode === 'STORE'
      ? user.storeId
      : (storeId ? +storeId : undefined);

    return this.reportsService.getDebtReport({
      storeId: effectiveStoreId,
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
  @Roles('STORE', 'SALES', 'ACCOUNTING', 'DIRECTOR', 'ADMIN')
  getSalesReport(
    @CurrentUser() user: any,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
    @Query('storeIds') storeIds?: string,
    @Query('productId') productId?: string,
  ) {
    // Nếu user là STORE, tự động lấy storeId của user
    let effectiveStoreIds: number[] | undefined;

    if (user.roleCode === 'STORE') {
      effectiveStoreIds = [user.storeId];
    } else if (storeIds) {
      effectiveStoreIds = storeIds.split(',').map(Number);
    }

    return this.reportsService.getSalesReport(
      new Date(fromDate),
      new Date(toDate),
      effectiveStoreIds,
      productId ? +productId : undefined,
    );
  }

  @Get('sales/by-pump')
  @Roles('STORE', 'SALES', 'ACCOUNTING', 'DIRECTOR', 'ADMIN')
  getSalesByPumpReport(
    @CurrentUser() user: any,
    @Query('storeId') storeId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    const effectiveStoreId = user.roleCode === 'STORE' ? user.storeId : (storeId ? +storeId : undefined);
    return this.reportsService.getSalesByPumpReport(
      effectiveStoreId,
      new Date(fromDate),
      new Date(toDate),
    );
  }

  @Get('sales/by-product')
  @Roles('STORE', 'SALES', 'ACCOUNTING', 'DIRECTOR', 'ADMIN')
  getSalesByProductReport(
    @CurrentUser() user: any,
    @Query('storeId') storeId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    const effectiveStoreId = user.roleCode === 'STORE' ? user.storeId : (storeId ? +storeId : undefined);
    return this.reportsService.getSalesByProductReport(
      effectiveStoreId,
      new Date(fromDate),
      new Date(toDate),
    );
  }

  /**
   * GET /reports/cash?storeId=1&fromDate=2024-01-01&toDate=2024-12-31
   * Báo cáo sổ quỹ tiền mặt chi tiết
   * - Kế toán/Director: Xem tất cả cửa hàng
   * - Cửa hàng (STORE): Chỉ xem sổ quỹ của cửa hàng mình
   */
  @Get('cash')
  @Roles('STORE', 'ACCOUNTING', 'DIRECTOR', 'ADMIN')
  getCashReport(
    @CurrentUser() user: any,
    @Query('storeId') storeId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    // Nếu user là STORE, tự động lấy storeId của user
    const effectiveStoreId = user.roleCode === 'STORE'
      ? user.storeId
      : (storeId ? +storeId : undefined);

    return this.reportsService.getCashReport({
      storeId: effectiveStoreId,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
    });
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
