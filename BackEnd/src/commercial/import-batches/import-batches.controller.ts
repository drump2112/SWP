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
import { ImportBatchesService } from './import-batches.service';
import { CreateImportBatchDto } from './dto/create-import-batch.dto';
import { UpdateImportBatchDto } from './dto/update-import-batch.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('commercial/import-batches')
@UseGuards(JwtAuthGuard)
export class ImportBatchesController {
  constructor(private readonly batchesService: ImportBatchesService) {}

  @Post()
  create(@Body() createBatchDto: CreateImportBatchDto) {
    return this.batchesService.create(createBatchDto);
  }

  @Get()
  findAll(
    @Query('warehouse_id') warehouseId?: string,
    @Query('supplier_id') supplierId?: string,
    @Query('product_id') productId?: string,
    @Query('from_date') fromDate?: string,
    @Query('to_date') toDate?: string,
  ) {
    const filters = {
      warehouse_id: warehouseId ? +warehouseId : undefined,
      supplier_id: supplierId ? +supplierId : undefined,
      product_id: productId ? +productId : undefined,
      from_date: fromDate,
      to_date: toDate,
    };
    return this.batchesService.findAll(filters);
  }

  @Get('available/:productId')
  getAvailable(
    @Param('productId') productId: string,
    @Query('warehouse_id') warehouseId?: string,
  ) {
    return this.batchesService.getAvailableBatches(
      +productId,
      warehouseId ? +warehouseId : undefined,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.batchesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateBatchDto: UpdateImportBatchDto) {
    return this.batchesService.update(+id, updateBatchDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.batchesService.remove(+id);
  }
}
