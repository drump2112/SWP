import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Query, Res, BadRequestException } from '@nestjs/common';
import type { Response } from 'express';
import { InventoryService } from './inventory.service';
import { InventoryExportService } from './inventory-export.service';
import { CreateInventoryDocumentDto } from './dto/create-inventory-document.dto';
import { CreateInventoryDocumentWithTruckDto } from './dto/create-inventory-document-with-truck.dto';
import { InitialStockDto } from './dto/initial-stock.dto';
import { SimpleInitialStockDto } from './dto/simple-initial-stock.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryController {
  constructor(
    private inventoryService: InventoryService,
    private inventoryExportService: InventoryExportService,
  ) {}

  @Post('documents')
  @Roles('STORE', 'SALES', 'ADMIN')
  createDocument(@Body() createDto: CreateInventoryDocumentDto) {
    return this.inventoryService.createDocument(createDto);
  }

  @Get('balance/:warehouseId')
  @Roles('STORE', 'SALES', 'ACCOUNTING', 'DIRECTOR', 'ADMIN')
  getInventoryBalance(@Param('warehouseId') warehouseId: string) {
    return this.inventoryService.getInventoryBalance(+warehouseId);
  }

  @Get('report/:warehouseId')
  @Roles('STORE', 'SALES', 'ACCOUNTING', 'DIRECTOR', 'ADMIN')
  async getInventoryReport(
    @Param('warehouseId') warehouseId: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('priceId') priceId?: string,
  ) {
    return this.inventoryService.getInventoryReport(+warehouseId, fromDate, toDate, priceId ? +priceId : undefined);
  }

  @Get('report-by-store/:storeId')
  @Roles('STORE', 'SALES', 'ACCOUNTING', 'DIRECTOR', 'ADMIN')
  async getInventoryReportByStore(
    @CurrentUser() user: any,
    @Param('storeId') storeId: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('priceId') priceId?: string,
  ) {
    // Nếu user là STORE, tự động dùng storeId của user, bỏ qua tham số
    const effectiveStoreId = user.roleCode === 'STORE' ? user.storeId : +storeId;

    return this.inventoryService.getInventoryReportByStore(effectiveStoreId, fromDate, toDate, priceId ? +priceId : undefined);
  }

  /**
   * 🔥 GET /inventory/report-by-tank/:storeId
   * Báo cáo nhập xuất tồn THEO BỂ (Tank-based)
   */
  @Get('report-by-tank/:storeId')
  @Roles('STORE', 'SALES', 'ACCOUNTING', 'DIRECTOR', 'ADMIN')
  async getInventoryReportByTank(
    @CurrentUser() user: any,
    @Param('storeId') storeId: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    const effectiveStoreId = user.roleCode === 'STORE' ? user.storeId : +storeId;
    return this.inventoryService.getInventoryReportByTank(effectiveStoreId, fromDate, toDate);
  }

  /**
   * 🔥 GET /inventory/report-by-tank-with-periods/:storeId
   * Báo cáo nhập xuất tồn TÁCH THEO KỲ CHỐT (Closed + Open periods)
   */
  @Get('report-by-tank-with-periods/:storeId')
  @Roles('STORE', 'SALES', 'ACCOUNTING', 'DIRECTOR', 'ADMIN')
  async getInventoryReportByTankWithPeriods(
    @CurrentUser() user: any,
    @Param('storeId') storeId: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    const effectiveStoreId = user.roleCode === 'STORE' ? user.storeId : +storeId;
    return this.inventoryService.getInventoryReportByTankWithPeriods(effectiveStoreId, fromDate, toDate);
  }

  @Get('documents')
  @Roles('STORE', 'SALES', 'ACCOUNTING', 'DIRECTOR', 'ADMIN')
  getDocuments(
    @CurrentUser() user: any,
    @Query('storeId') storeId: string,
    @Query('type') type: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    // Nếu user là STORE, tự động dùng storeId của user, bỏ qua tham số
    const effectiveStoreId = user.roleCode === 'STORE' ? user.storeId : +storeId;

    return this.inventoryService.getDocuments(effectiveStoreId, type, fromDate, toDate);
  }

  @Get('all-stores')
  @Roles('SALES', 'ACCOUNTING', 'DIRECTOR', 'ADMIN')
  getAllStoresInventory() {
    return this.inventoryService.getAllStoresInventory();
  }

  // ==================== API CHO PHIẾU NHẬP KHO VỚI XE TÉC ====================

  /**
   * POST /inventory/documents/with-truck
   * Tạo phiếu nhập kho với chi tiết xe téc và tính toán hao hụt
   */
  @Post('documents/with-truck')
  @Roles('STORE', 'SALES', 'ADMIN')
  createDocumentWithTruck(@Body() createDto: CreateInventoryDocumentWithTruckDto) {
    return this.inventoryService.createDocumentWithTruck(createDto);
  }

  /**
   * GET /inventory/documents/with-truck/:documentId
   * Lấy chi tiết phiếu nhập kho với xe téc và tính toán
   */
  @Get('documents/with-truck/:documentId')
  @Roles('STORE', 'SALES', 'ACCOUNTING', 'DIRECTOR', 'ADMIN')
  getDocumentWithTruck(@Param('documentId') documentId: string) {
    return this.inventoryService.getDocumentWithTruck(+documentId);
  }

  /**
   * GET /inventory/documents/with-truck/:documentId/export-excel
   * Xuất file Excel biên bản giao nhận xăng dầu
   */
  @Get('documents/with-truck/:documentId/export-excel')
  @Roles('STORE', 'SALES', 'ACCOUNTING', 'DIRECTOR', 'ADMIN')
  async exportDocumentToExcel(
    @Param('documentId') documentId: string,
    @Res() response: Response,
  ) {
    const documentData = await this.inventoryService.getDocumentWithTruck(+documentId);
    return this.inventoryExportService.exportInventoryDocumentToExcel(documentData, response);
  }

  // ==================== API NHẬP TỒN ĐẦU KỲ ====================

  /**
   * POST /inventory/initial-stock
   * Nhập tồn đầu kỳ cho cửa hàng
   * Dùng khi setup ban đầu hoặc điều chỉnh tồn kho
   */
  @Post('initial-stock')
  @Roles('ADMIN', 'ACCOUNTING')
  setInitialStock(@Body() initialStockDto: InitialStockDto) {
    return this.inventoryService.setInitialStock(initialStockDto);
  }

  /**
   * GET /inventory/stock-report/:storeId
   * Báo cáo tồn kho chi tiết theo bể
   */
  @Get('stock-report/:storeId')
  @Roles('STORE', 'SALES', 'ACCOUNTING', 'DIRECTOR', 'ADMIN')
  getStockReportByTank(@Param('storeId') storeId: string) {
    return this.inventoryService.getStockReportByTank(+storeId);
  }

  /**
   * GET /inventory/stock-summary/:storeId
   * Báo cáo tổng hợp tồn kho theo mặt hàng (không chi tiết tank)
   * Chỉ ADMIN mới được phép
   */
  @Get('stock-summary/:storeId')
  @Roles('ADMIN')
  getStockReportByProduct(@Param('storeId') storeId: string) {
    return this.inventoryService.getStockReportByProduct(+storeId);
  }

  /**
   * GET /inventory/documents/by-shift/:shiftId
   * Lấy danh sách phiếu nhập kho theo ca làm việc
   */
  @Get('documents/by-shift/:shiftId')
  @Roles('STORE', 'SALES', 'ACCOUNTING', 'DIRECTOR', 'ADMIN')
  getDocumentsByShift(@Param('shiftId') shiftId: string) {
    return this.inventoryService.getDocumentsByShift(+shiftId);
  }

  @Get('test-error')
  testError() {
    throw new BadRequestException('Đây là lỗi thử nghiệm');
  }


  /**
   * POST /inventory/simple-initial-stock
   * Nhập tồn đầu đơn giản theo cửa hàng + mặt hàng (KHÔNG cần tank)
   * Chỉ ADMIN mới được phép
   */
  @Post('simple-initial-stock')
  @Roles('ADMIN')
  setSimpleInitialStock(@Body() dto: SimpleInitialStockDto) {
    return this.inventoryService.setSimpleInitialStock(dto);
  }

  /**
   * GET /inventory/initial-stock-records
   * Lấy danh sách bản ghi tồn đầu theo cửa hàng
   * Query params: storeId (optional)
   */
  @Get('initial-stock-records')
  @Roles('ADMIN', 'ACCOUNTING')
  getInitialStockRecords(@Query('storeId') storeId?: string) {
    return this.inventoryService.getInitialStockRecords(storeId ? +storeId : undefined);
  }

  /**
   * PUT /inventory/initial-stock
   * Cập nhật tồn đầu kỳ
   */
  @Put('initial-stock')
  @Roles('ADMIN', 'ACCOUNTING')
  updateInitialStock(@Body() dto: any) {
    return this.inventoryService.updateInitialStock(dto);
  }

  /**
   * DELETE /inventory/documents/:id
   * Xóa phiếu nhập/xuất kho (dùng khi sửa ca)
   */
  @Delete('documents/:id')
  @Roles('STORE', 'ADMIN')
  deleteDocument(@Param('id') id: string) {
    return this.inventoryService.deleteDocument(+id);
  }
}
