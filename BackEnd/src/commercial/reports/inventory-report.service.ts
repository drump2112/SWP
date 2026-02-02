import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { ImportBatch } from '../../entities/import-batch.entity';
import { ExportOrderItem } from '../../entities/export-order-item.entity';

export interface InventoryReportDto {
  warehouse_id: number;
  warehouse_name: string;
  product_id: number;
  product_name: string;
  opening_stock: number;
  total_imported: number;
  total_exported: number;
  closing_stock: number;
}

@Injectable()
export class InventoryReportService {
  constructor(
    @InjectRepository(ImportBatch)
    private importBatchRepo: Repository<ImportBatch>,
    @InjectRepository(ExportOrderItem)
    private exportOrderItemRepo: Repository<ExportOrderItem>,
  ) {}

  async getInventoryReport(
    startDate: string,
    endDate: string,
    warehouseId?: number,
  ): Promise<InventoryReportDto[]> {
    // Get all imports in period
    const importsQuery = this.importBatchRepo
      .createQueryBuilder('batch')
      .leftJoinAndSelect('batch.warehouse', 'warehouse')
      .leftJoinAndSelect('batch.product', 'product')
      .where('batch.import_date BETWEEN :startDate AND :endDate', { startDate, endDate });

    if (warehouseId) {
      importsQuery.andWhere('batch.warehouse_id = :warehouseId', { warehouseId });
    }

    const imports = await importsQuery.getMany();

    // Get all exports in period (through batch)
    const exportsQuery = this.exportOrderItemRepo
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.import_batch', 'batch')
      .leftJoinAndSelect('batch.warehouse', 'warehouse')
      .leftJoinAndSelect('batch.product', 'product')
      .leftJoinAndSelect('item.export_order', 'order')
      .where('order.order_date BETWEEN :startDate AND :endDate', { startDate, endDate });

    if (warehouseId) {
      exportsQuery.andWhere('batch.warehouse_id = :warehouseId', { warehouseId });
    }

    const exports = await exportsQuery.getMany();

    // Group by warehouse and product
    const reportMap = new Map<string, InventoryReportDto>();

    // Process imports
    imports.forEach((batch) => {
      const key = `${batch.warehouse_id}-${batch.product_id}`;
      if (!reportMap.has(key)) {
        reportMap.set(key, {
          warehouse_id: batch.warehouse_id,
          warehouse_name: batch.warehouse.name,
          product_id: batch.product_id,
          product_name: batch.product.name,
          opening_stock: 0,
          total_imported: 0,
          total_exported: 0,
          closing_stock: 0,
        });
      }
      const report = reportMap.get(key)!;
      report.total_imported += batch.import_quantity;
    });

    // Process exports
    exports.forEach((item) => {
      const batch = item.import_batch;
      const key = `${batch.warehouse_id}-${batch.product_id}`;
      if (!reportMap.has(key)) {
        reportMap.set(key, {
          warehouse_id: batch.warehouse_id,
          warehouse_name: batch.warehouse.name,
          product_id: batch.product_id,
          product_name: batch.product.name,
          opening_stock: 0,
          total_imported: 0,
          total_exported: 0,
          closing_stock: 0,
        });
      }
      const report = reportMap.get(key)!;
      report.total_exported += item.quantity;
    });

    // Calculate closing stock
    reportMap.forEach((report) => {
      report.closing_stock = report.opening_stock + report.total_imported - report.total_exported;
    });

    return Array.from(reportMap.values());
  }
}
