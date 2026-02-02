import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ExportOrdersService } from './export-orders.service';
import { CreateExportOrderDto } from './dto/create-export-order.dto';
import { UpdateExportOrderDto } from './dto/update-export-order.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('commercial/export-orders')
@UseGuards(JwtAuthGuard)
export class ExportOrdersController {
  constructor(private readonly ordersService: ExportOrdersService) {}

  @Post()
  create(@Body() createOrderDto: CreateExportOrderDto) {
    return this.ordersService.create(createOrderDto);
  }

  @Get()
  findAll(
    @Query('customer_id') customerId?: string,
    @Query('warehouse_id') warehouseId?: string,
    @Query('from_date') fromDate?: string,
    @Query('to_date') toDate?: string,
    @Query('payment_status') paymentStatus?: string,
  ) {
    const filters = {
      customer_id: customerId ? +customerId : undefined,
      warehouse_id: warehouseId ? +warehouseId : undefined,
      from_date: fromDate,
      to_date: toDate,
      payment_status: paymentStatus,
    };
    return this.ordersService.findAll(filters);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateOrderDto: UpdateExportOrderDto) {
    return this.ordersService.update(+id, updateOrderDto);
  }

  @Patch(':id/payment-status')
  updatePaymentStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.ordersService.updatePaymentStatus(+id, status);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ordersService.remove(+id);
  }
}
