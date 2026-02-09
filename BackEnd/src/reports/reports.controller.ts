import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RevenueSalesReportQueryDto, SalesByCustomerReportQueryDto } from './dto/revenue-sales-report.dto';

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
    const effectiveStoreId =
      user.roleCode === 'STORE' ? user.storeId : storeId ? +storeId : undefined;

    return this.reportsService.getDebtReport({
      storeId: effectiveStoreId,
      customerId: customerId ? +customerId : undefined,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
    });
  }

  /**
   * GET /reports/shift-handover/:shiftId
   * Báo cáo sổ giao ca
   */
  @Get('shift-handover/:shiftId')
  @Roles('STORE', 'SALES', 'ACCOUNTING', 'DIRECTOR', 'ADMIN')
  getShiftHandoverReport(@Param('shiftId') shiftId: string) {
    return this.reportsService.getShiftHandoverReport(+shiftId);
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
    @Query('refType') refType?: string,
    @Query('groupBy') groupBy?: string,
  ) {
    // Nếu user là STORE, tự động lấy storeId của user
    const effectiveStoreId =
      user.roleCode === 'STORE' ? user.storeId : storeId ? +storeId : undefined;

    return this.reportsService.getCashReport({
      storeId: effectiveStoreId,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
      groupBy: groupBy === 'shift' ? 'shift' : 'day',
    });
  }

  @Get('inventory')
  @Roles('SALES', 'ACCOUNTING', 'DIRECTOR', 'ADMIN')
  getInventoryReport(@Query('warehouseId') warehouseId?: string) {
    return this.reportsService.getInventoryReport(
      warehouseId ? +warehouseId : undefined,
    );
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

  // ==================== INVENTORY IMPORT REPORTS ====================

  /**
   * GET /reports/inventory-import?warehouseId=1&storeId=1&fromDate=2024-01-01&toDate=2024-12-31&docType=IMPORT
   * Báo cáo bảng kê nhập kho (In Bảng Kê Nhập)
   * - Kế toán/Admin/Director: Xem tất cả kho
   * - Cửa hàng (STORE): Chỉ xem nhập kho của cửa hàng mình
   */
  @Get('inventory-import')
  @Roles('STORE', 'ACCOUNTING', 'DIRECTOR', 'ADMIN')
  getInventoryImportReport(
    @CurrentUser() user: any,
    @Query('warehouseId') warehouseId?: string,
    @Query('storeId') storeId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('docType') docType?: string,
  ) {
    // Nếu user là STORE, tự động lấy storeId của user
    const effectiveStoreId =
      user.roleCode === 'STORE' ? user.storeId : storeId ? +storeId : undefined;

    return this.reportsService.getInventoryImportReport({
      warehouseId: warehouseId ? +warehouseId : undefined,
      storeId: effectiveStoreId,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
      docType,
    });
  }

  /**
   * GET /reports/inventory-import/:documentId
   * Báo cáo chi tiết một phiếu nhập kho
   */
  @Get('inventory-import/:documentId')
  @Roles('STORE', 'ACCOUNTING', 'DIRECTOR', 'ADMIN')
  getInventoryImportDocumentDetail(@Param('documentId') documentId: string) {
    return this.reportsService.getInventoryImportDocumentDetail(+documentId);
  }

  /**
   * GET /reports/inventory-import-summary/by-product?warehouseId=1&storeId=1&fromDate=2024-01-01&toDate=2024-12-31
   * Báo cáo tổng hợp nhập kho theo mặt hàng
   */
  @Get('inventory-import-summary/by-product')
  @Roles('ACCOUNTING', 'DIRECTOR', 'ADMIN')
  getInventoryImportSummaryByProduct(
    @CurrentUser() user: any,
    @Query('warehouseId') warehouseId?: string,
    @Query('storeId') storeId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    const effectiveStoreId =
      user.roleCode === 'STORE' ? user.storeId : storeId ? +storeId : undefined;

    return this.reportsService.getInventoryImportSummaryByProduct({
      warehouseId: warehouseId ? +warehouseId : undefined,
      storeId: effectiveStoreId,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
    });
  }

  /**
   * GET /reports/inventory-import-summary/by-supplier?warehouseId=1&storeId=1&fromDate=2024-01-01&toDate=2024-12-31
   * Báo cáo tổng hợp nhập kho theo nhà cung cấp
   */

  @Get('inventory-import-summary/by-supplier')
  @Roles('ACCOUNTING', 'DIRECTOR', 'ADMIN')
  getInventoryImportSummaryBySupplier(
    @CurrentUser() user: any,
    @Query('warehouseId') warehouseId?: string,
    @Query('storeId') storeId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    const effectiveStoreId =
      user.roleCode === 'STORE' ? user.storeId : storeId ? +storeId : undefined;

    return this.reportsService.getInventoryImportSummaryBySupplier({
      warehouseId: warehouseId ? +warehouseId : undefined,
      storeId: effectiveStoreId,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
    });
  }

  // ==================== REVENUE / SALES REPORTS ====================

  /**
   * GET /reports/price-periods
   * Lấy danh sách kỳ giá để hiển thị trong dropdown filter
   */
  @Get('price-periods')
  @Roles('STORE', 'SALES', 'ACCOUNTING', 'DIRECTOR', 'ADMIN')
  getPricePeriods() {
    return this.reportsService.getPricePeriods();
  }

  /**
   * GET /reports/revenue-sales?productId=1&storeId=2&priceId=3&fromDateTime=2024-01-01T00:00:00&toDateTime=2024-12-31T23:59:59
   * Báo cáo doanh thu / xuất hàng
   *
   * Filters:
   * - productId: Lọc theo mặt hàng
   * - storeId: Lọc theo cửa hàng (STORE role tự động lấy storeId của user)
   * - priceId: Lọc theo kỳ giá (từ dropdown)
   * - fromDateTime, toDateTime: Lọc theo thời gian (có thể chọn giờ/phút/giây)
   *
   * Response bao gồm:
   * - stores: Danh sách cửa hàng với mặt hàng
   * - summary: Tổng hợp (tổng số lượng, tổng tiền)
   */
  @Get('revenue-sales')
  @Roles('STORE', 'SALES', 'ACCOUNTING', 'DIRECTOR', 'ADMIN')
  getRevenueSalesReport(
    @CurrentUser() user: any,
    @Query() queryDto: RevenueSalesReportQueryDto,
  ) {
    // Nếu user là STORE, tự động lấy storeId của user
    const effectiveStoreId =
      user.roleCode === 'STORE' ? user.storeId : queryDto.storeId;

    // Override storeId trong query
    const finalQuery: RevenueSalesReportQueryDto = {
      ...queryDto,
      storeId: effectiveStoreId,
    };

    return this.reportsService.getRevenueSalesReport(finalQuery);
  }

  /**
   * GET /reports/sales-by-customer?customerId=1&storeId=2&productId=3&fromDateTime=2024-01-01T00:00:00&toDateTime=2024-12-31T23:59:59
   * Báo cáo doanh thu theo khách hàng
   *
   * Filters:
   * - customerId: Lọc theo khách hàng
   * - storeId: Lọc theo cửa hàng (STORE role tự động lấy storeId của user)
   * - productId: Lọc theo mặt hàng
   * - fromDateTime, toDateTime: Lọc theo thời gian
   *
   * Response bao gồm:
   * - customers: Danh sách khách hàng với mặt hàng
   * - summary: Tổng hợp (tổng số lượng, tổng tiền)
   */
  @Get('sales-by-customer')
  @Roles('STORE', 'SALES', 'ACCOUNTING', 'DIRECTOR', 'ADMIN')
  getSalesByCustomerReport(
    @CurrentUser() user: any,
    @Query() queryDto: SalesByCustomerReportQueryDto,
  ) {
    // Nếu user là STORE, tự động lấy storeId của user
    const effectiveStoreId =
      user.roleCode === 'STORE' ? user.storeId : queryDto.storeId;

    // Override storeId trong query
    const finalQuery: SalesByCustomerReportQueryDto = {
      ...queryDto,
      storeId: effectiveStoreId,
    };

    return this.reportsService.getSalesByCustomerReport(finalQuery);
  }

  /**
   * Báo cáo ca (theo pump readings)
   * GET /reports/sales-by-shift
   *
   * Query params:
   * - storeId: Lọc theo cửa hàng (bắt buộc)
   * - fromDate, toDate: Lọc theo ngày
   */
  @Get('sales-by-shift')
  @Roles('STORE', 'SALES', 'ACCOUNTING', 'DIRECTOR', 'ADMIN')
  getSalesByShiftReport(
    @CurrentUser() user: any,
    @Query('storeId') storeId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    // Nếu user là STORE, tự động lấy storeId của user
    const effectiveStoreId =
      user.roleCode === 'STORE' ? user.storeId : (storeId ? +storeId : undefined);

    return this.reportsService.getSalesByShiftReport(
      effectiveStoreId,
      fromDate ? new Date(fromDate) : undefined,
      toDate ? new Date(toDate) : undefined,
    );
  }
}
