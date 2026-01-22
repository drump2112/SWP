import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LossConfigService } from './loss-config.service';
import { CreateLossConfigDto, UpdateLossConfigDto } from './dto/loss-config.dto';

@Controller('loss-config')
@UseGuards(JwtAuthGuard)
export class LossConfigController {
  constructor(private readonly lossConfigService: LossConfigService) {}

  /**
   * GET /loss-config - Lấy tất cả cấu hình
   */
  @Get()
  async findAll() {
    return this.lossConfigService.findAll();
  }

  /**
   * GET /loss-config/store/:storeId - Lấy cấu hình theo cửa hàng
   */
  @Get('store/:storeId')
  async findByStore(@Param('storeId', ParseIntPipe) storeId: number) {
    return this.lossConfigService.findByStore(storeId);
  }

  /**
   * GET /loss-config/store/:storeId/current - Lấy cấu hình đang hiệu lực
   */
  @Get('store/:storeId/current')
  async getCurrentConfigs(@Param('storeId', ParseIntPipe) storeId: number) {
    return this.lossConfigService.getCurrentConfigs(storeId);
  }

  /**
   * GET /loss-config/:id - Lấy cấu hình theo ID
   */
  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.lossConfigService.findById(id);
  }

  /**
   * POST /loss-config - Tạo cấu hình mới
   */
  @Post()
  async create(@Body() dto: CreateLossConfigDto, @Request() req: any) {
    const userId = req.user?.id;
    return this.lossConfigService.create(dto, userId);
  }

  /**
   * PUT /loss-config/:id - Cập nhật cấu hình
   */
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLossConfigDto,
  ) {
    return this.lossConfigService.update(id, dto);
  }

  /**
   * DELETE /loss-config/:id - Xóa cấu hình
   */
  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.lossConfigService.delete(id);
    return { message: 'Đã xóa cấu hình hao hụt' };
  }
}
