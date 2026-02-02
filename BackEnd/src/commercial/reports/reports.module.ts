import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryReportController } from './inventory-report.controller';
import { InventoryReportService } from './inventory-report.service';
import { ImportBatch } from '../../entities/import-batch.entity';
import { ExportOrderItem } from '../../entities/export-order-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ImportBatch, ExportOrderItem])],
  controllers: [InventoryReportController],
  providers: [InventoryReportService],
})
export class ReportsModule {}
