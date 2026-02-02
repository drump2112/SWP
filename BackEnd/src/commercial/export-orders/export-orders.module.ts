import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExportOrdersService } from './export-orders.service';
import { ExportOrdersController } from './export-orders.controller';
import { ExportOrder } from '../../entities/export-order.entity';
import { ExportOrderItem } from '../../entities/export-order-item.entity';
import { ImportBatch } from '../../entities/import-batch.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ExportOrder, ExportOrderItem, ImportBatch])],
  controllers: [ExportOrdersController],
  providers: [ExportOrdersService],
  exports: [ExportOrdersService],
})
export class ExportOrdersModule {}
