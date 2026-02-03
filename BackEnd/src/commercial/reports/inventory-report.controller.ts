import { Controller, Get, Query } from '@nestjs/common';
import { InventoryReportService } from './inventory-report.service';

@Controller('commercial/reports/inventory')
export class InventoryReportController {
  constructor(private readonly reportService: InventoryReportService) {}

  @Get('detailed')
  async getDetailedReport(
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
    @Query('warehouse_id') warehouseId?: number,
    @Query('supplier_id') supplierId?: number,
  ) {
    return this.reportService.getDetailedReport(startDate, endDate, warehouseId, supplierId);
  }

  @Get('batch')
  async getBatchReport(
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
    @Query('warehouse_id') warehouseId?: number,
    @Query('supplier_id') supplierId?: number,
  ) {
    return this.reportService.getBatchReport(startDate, endDate, warehouseId, supplierId);
  }
}
