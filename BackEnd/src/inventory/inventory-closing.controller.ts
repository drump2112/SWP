import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InventoryClosingService } from './inventory-closing.service';
import { CreateInventoryClosingDto } from './dto/inventory-closing.dto';

@Controller('inventory-closing')
@UseGuards(JwtAuthGuard)
export class InventoryClosingController {
  constructor(private readonly closingService: InventoryClosingService) {}

  /**
   * GET /inventory-closing/preview - Xem trước dữ liệu chốt kỳ
   */
  @Get('preview')
  async preview(
    @Query('storeId', ParseIntPipe) storeId: number,
    @Query('periodFrom') periodFrom: string,
    @Query('periodTo') periodTo: string,
  ) {
    return this.closingService.previewClosing({
      storeId,
      periodFrom,
      periodTo,
    });
  }

  /**
   * POST /inventory-closing - Thực hiện chốt kỳ
   */
  @Post()
  async execute(@Body() dto: CreateInventoryClosingDto, @Request() req: any) {
    const userId = req.user?.id;
    return this.closingService.executeClosing(dto, userId);
  }

  /**
   * GET /inventory-closing/store/:storeId - Lấy danh sách kỳ đã chốt
   */
  @Get('store/:storeId')
  async getByStore(
    @Param('storeId', ParseIntPipe) storeId: number,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.closingService.getClosingsByStore(storeId, fromDate, toDate);
  }

  /**
   * GET /inventory-closing/periods/:storeId - Lấy danh sách kỳ (unique)
   */
  @Get('periods/:storeId')
  async getPeriods(@Param('storeId', ParseIntPipe) storeId: number) {
    return this.closingService.getClosingPeriods(storeId);
  }

  /**
   * GET /inventory-closing/report/:storeId - Lấy báo cáo theo kỳ đã chốt
   */
  @Get('report/:storeId')
  async getReport(
    @Param('storeId', ParseIntPipe) storeId: number,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    return this.closingService.getReportByClosedPeriods(storeId, fromDate, toDate);
  }

  /**
   * DELETE /inventory-closing - Xóa kỳ chốt
   */
  @Delete()
  async delete(
    @Query('storeId', ParseIntPipe) storeId: number,
    @Query('periodFrom') periodFrom: string,
    @Query('periodTo') periodTo: string,
  ) {
    await this.closingService.deleteClosing(storeId, periodFrom, periodTo);
    return { message: 'Đã xóa kỳ chốt' };
  }
}
