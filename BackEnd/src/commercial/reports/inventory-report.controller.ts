import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
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
    try {
      if (!startDate || !endDate) {
        throw new BadRequestException('start_date and end_date are required');
      }
      return await this.reportService.getDetailedReport(startDate, endDate, warehouseId, supplierId);
    } catch (error) {
      console.error('[InventoryReportController] Error in getDetailedReport:', error);
      throw error;
    }
  }

  @Get('batch')
  async getBatchReport(
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
    @Query('warehouse_id') warehouseId?: number,
    @Query('supplier_id') supplierId?: number,
  ) {
    try {
      if (!startDate || !endDate) {
        throw new BadRequestException('start_date and end_date are required');
      }
      return await this.reportService.getBatchReport(startDate, endDate, warehouseId, supplierId);
    } catch (error) {
      console.error('[InventoryReportController] Error in getBatchReport:', error);
      throw error;
    }
  }
}
