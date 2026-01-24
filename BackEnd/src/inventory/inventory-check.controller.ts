import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InventoryCheckService } from './inventory-check.service';
import { CreateInventoryCheckDto, InventoryCheckQueryDto } from './dto/inventory-check.dto';

@Controller('inventory-checks')
@UseGuards(JwtAuthGuard)
export class InventoryCheckController {
  constructor(private readonly inventoryCheckService: InventoryCheckService) {}

  /**
   * Tạo biên bản kiểm kê mới
   * POST /inventory-checks
   */
  @Post()
  async create(@Body() dto: CreateInventoryCheckDto, @Request() req: any) {
    return this.inventoryCheckService.create(dto, req.user.id);
  }

  /**
   * Lấy danh sách biên bản kiểm kê
   * GET /inventory-checks?storeId=1&fromDate=2026-01-01&toDate=2026-01-31
   */
  @Get()
  async findAll(@Query() query: InventoryCheckQueryDto) {
    // Convert string to number if needed
    if (query.storeId) {
      query.storeId = Number(query.storeId);
    }
    return this.inventoryCheckService.findAll(query);
  }

  /**
   * Lấy chi tiết 1 biên bản
   * GET /inventory-checks/:id
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.inventoryCheckService.findOne(+id);
  }

  /**
   * Cập nhật biên bản
   * PUT /inventory-checks/:id
   */
  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: Partial<CreateInventoryCheckDto>) {
    return this.inventoryCheckService.update(+id, dto);
  }

  /**
   * Xóa biên bản
   * DELETE /inventory-checks/:id
   */
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.inventoryCheckService.remove(+id);
    return { success: true, message: 'Đã xóa biên bản kiểm kê' };
  }

  /**
   * Xác nhận biên bản
   * POST /inventory-checks/:id/confirm
   */
  @Post(':id/confirm')
  async confirm(@Param('id') id: string) {
    return this.inventoryCheckService.confirm(+id);
  }
}
