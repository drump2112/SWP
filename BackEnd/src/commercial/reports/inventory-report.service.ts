import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ImportBatch } from '../../entities/import-batch.entity';
import { ExportOrderItem } from '../../entities/export-order-item.entity';

// Batch-level detail report (like the Excel template)
export interface BatchDetailDto {
  batch_id: number;
  batch_code: string;
  import_date: string;
  product_name: string;
  supplier_name: string;
  warehouse_name: string;
  // Import columns
  import_quantity: number;
  import_discount: number;
  import_eco_fee: number;
  import_env_tax: number;
  import_total: number;
  // Export columns
  export_unit: string;
  export_quantity: number;
  export_discount: number;
  export_eco_fee: number;
  export_total: number;
  export_env_tax: number;
  export_profit: number;
  // Inventory columns
  closing_quantity: number;
  closing_total: number;
  note: string;
}

export interface BatchReportDto {
  batches: BatchDetailDto[];
  summary: {
    total_import_quantity: number;
    total_import_amount: number;
    total_export_quantity: number;
    total_export_amount: number;
    total_closing_quantity: number;
    total_closing_amount: number;
    total_profit: number;
  };
}

// Summary report (grouped by supplier/customer group)
export interface ImportDetailDto {
  supplier_id: number;
  supplier_name: string;
  product_id: number;
  product_name: string;
  warehouse_id: number;
  warehouse_name: string;
  quantity_a95: number;
  quantity_do: number;
  quantity_e5: number;
  quantity_do001: number;
  total_quantity: number;
  total_amount: number;
}

export interface ExportDetailDto {
  customer_group_id: number | null;
  customer_group_name: string;
  customer_id: number | null;
  customer_name: string | null;
  warehouse_id: number;
  warehouse_name: string;
  quantity_a95: number;
  quantity_do: number;
  quantity_e5: number;
  quantity_do001: number;
  total_quantity: number;
  revenue_a95: number;
  revenue_do: number;
  revenue_e5: number;
  revenue_do001: number;
  revenue: number;
  cost: number;
  profit_a95: number;
  profit_do: number;
  profit_e5: number;
  profit: number;
}

export interface DetailedInventoryReportDto {
  imports: ImportDetailDto[];
  exports: ExportDetailDto[];
  summary: {
    total_import_quantity: number;
    total_import_amount: number;
    total_export_quantity: number;
    total_revenue: number;
    total_cost: number;
    total_profit: number;
  };
}

@Injectable()
export class InventoryReportService {
  constructor(
    @InjectRepository(ImportBatch)
    private importBatchRepo: Repository<ImportBatch>,
    @InjectRepository(ExportOrderItem)
    private exportOrderItemRepo: Repository<ExportOrderItem>,
  ) {}

  async getDetailedReport(
    startDate: string,
    endDate: string,
    warehouseId?: number,
    supplierId?: number,
  ): Promise<DetailedInventoryReportDto> {
    try {
      // Get imports with supplier info
      const importsQuery = this.importBatchRepo
      .createQueryBuilder('batch')
      .leftJoinAndSelect('batch.warehouse', 'warehouse')
      .leftJoinAndSelect('batch.product', 'product')
      .leftJoinAndSelect('batch.supplier', 'supplier')
      .where('batch.import_date BETWEEN :startDate AND :endDate', { startDate, endDate });

    if (warehouseId) {
      importsQuery.andWhere('batch.warehouse_id = :warehouseId', { warehouseId });
    }

    if (supplierId) {
      importsQuery.andWhere('batch.supplier_id = :supplierId', { supplierId });
    }

    const imports = await importsQuery.getMany();
    console.log(`[InventoryReport] Found ${imports.length} imports from ${startDate} to ${endDate}`);

    // Get exports with customer and group info
    const exportsQuery = this.exportOrderItemRepo
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.import_batch', 'batch')
      .leftJoinAndSelect('batch.warehouse', 'warehouse')
      .leftJoinAndSelect('batch.product', 'product')
      .leftJoinAndSelect('item.customer', 'customer')
      .leftJoinAndSelect('customer.customer_group', 'customer_group')
      .leftJoinAndSelect('item.export_order', 'order')
      .where('order.order_date BETWEEN :startDate AND :endDate', { startDate, endDate });

    if (warehouseId) {
      exportsQuery.andWhere('batch.warehouse_id = :warehouseId', { warehouseId });
    }

    const exports = await exportsQuery.getMany();
    console.log(`[InventoryReport] Found ${exports.length} exports from ${startDate} to ${endDate}`);

    // Group imports by supplier and product
    const importMap = new Map<string, ImportDetailDto>();
    imports.forEach((batch) => {
      // Validate batch data before processing
      if (!batch.warehouse || !batch.product) {
        console.warn(`[InventoryReport] Skipping batch ${batch.id} - missing warehouse or product`);
        return;
      }

      const key = `${batch.supplier_id}-${batch.product_id}-${batch.warehouse_id}`;
      if (!importMap.has(key)) {
        importMap.set(key, {
          supplier_id: batch.supplier_id,
          supplier_name: batch.supplier?.name || 'N/A',
          product_id: batch.product_id,
          product_name: batch.product.name,
          warehouse_id: batch.warehouse_id,
          warehouse_name: batch.warehouse.name,
          quantity_a95: 0,
          quantity_do: 0,
          quantity_e5: 0,
          quantity_do001: 0,
          total_quantity: 0,
          total_amount: 0,
        });
      }
      const record = importMap.get(key)!;
      const productName = batch.product.name.toUpperCase();
      const importQty = Number(batch.import_quantity) || 0;
      const unitPrice = Number(batch.unit_price) || 0;

      console.log(`[InventoryReport] Processing import batch ${batch.id}: product="${batch.product.name}" (${productName}), quantity=${importQty}, price=${unitPrice}`);

      // Match sản phẩm vào category
      if (productName.includes('A95') || productName.includes('95')) {
        console.log(`  → Matched to A95`);
        record.quantity_a95 += importQty;
      } else if (productName.includes('E5')) {
        console.log(`  → Matched to E5`);
        record.quantity_e5 += importQty;
      } else if ((productName.includes('DO') || productName.includes('DẦU') || productName.includes('DIESEL')) &&
                 (productName.includes('0.001') || productName.includes('0,001'))) {
        console.log(`  → Matched to DO001`);
        record.quantity_do001 += importQty;
      } else if (productName.includes('DO') || productName.includes('DẦU') || productName.includes('DIESEL')) {
        console.log(`  → Matched to DO`);
        record.quantity_do += importQty;
      } else {
        console.log(`  ⚠ NO MATCH - Product will be unmapped`);
      }

      record.total_quantity += importQty;
      record.total_amount += importQty * unitPrice;
    });

    // Group exports by customer group and individual customer
    const exportGroupMap = new Map<string, ExportDetailDto>();
    const exportCustomerMap = new Map<string, ExportDetailDto>();

    exports.forEach((item) => {
      if (!item.import_batch || !item.import_batch.warehouse || !item.import_batch.product) {
        console.warn(`[InventoryReport] Skipping export item ${item.id} - missing batch data`);
        return;
      }

      const batch = item.import_batch;
      const customer = item.customer;
      const groupId = customer?.customer_group_id || null;
      const groupName = customer?.customer_group?.name || 'Không nhóm';

      console.log(`[InventoryReport] Processing export item ${item.id}: product="${batch.product.name}", quantity=${item.quantity}, customer="${customer?.name}"`);

      // Create/update customer group total
      const groupKey = `group-${groupId}-${batch.warehouse_id}`;
      if (!exportGroupMap.has(groupKey)) {
        exportGroupMap.set(groupKey, {
          customer_group_id: groupId,
          customer_group_name: groupName,
          customer_id: null,
          customer_name: null,
          warehouse_id: batch.warehouse_id,
          warehouse_name: batch.warehouse.name,
          quantity_a95: 0,
          quantity_do: 0,
          quantity_e5: 0,
          quantity_do001: 0,
          total_quantity: 0,
          revenue_a95: 0,
          revenue_do: 0,
          revenue_e5: 0,
          revenue_do001: 0,
          revenue: 0,
          cost: 0,
          profit_a95: 0,
          profit_do: 0,
          profit_e5: 0,
          profit: 0,
        });
      }
      const groupRecord = exportGroupMap.get(groupKey)!;
      this.addExportData(groupRecord, item, batch);

      // Create/update individual customer
      const customerKey = `customer-${item.customer_id}-${batch.warehouse_id}`;
      if (!exportCustomerMap.has(customerKey)) {
        exportCustomerMap.set(customerKey, {
          customer_group_id: groupId,
          customer_group_name: groupName,
          customer_id: item.customer_id,
          customer_name: customer?.name || 'N/A',
          warehouse_id: batch.warehouse_id,
          warehouse_name: batch.warehouse.name,
          quantity_a95: 0,
          quantity_do: 0,
          quantity_e5: 0,
          quantity_do001: 0,
          total_quantity: 0,
          revenue_a95: 0,
          revenue_do: 0,
          revenue_e5: 0,
          revenue_do001: 0,
          revenue: 0,
          cost: 0,
          profit_a95: 0,
          profit_do: 0,
          profit_e5: 0,
          profit: 0,
        });
      }
      const customerRecord = exportCustomerMap.get(customerKey)!;
      this.addExportData(customerRecord, item, batch);
    });

    // Combine: groups first, then their customers
    const exportDetails: ExportDetailDto[] = [];
    const groupsArray = Array.from(exportGroupMap.values());

    groupsArray.forEach(group => {
      // Add group total
      exportDetails.push(group);

      // Add individual customers in this group
      const customersInGroup = Array.from(exportCustomerMap.values())
        .filter(c => c.customer_group_id === group.customer_group_id);
      exportDetails.push(...customersInGroup);
    });

    // Add customers without group
    const customersWithoutGroup = Array.from(exportCustomerMap.values())
      .filter(c => c.customer_group_id === null);
    exportDetails.push(...customersWithoutGroup);

    const importDetails = Array.from(importMap.values());

    // Only count group totals for summary (not individual customers)
    const groupTotals = exportDetails.filter(d => d.customer_id === null);

    const result = {
      imports: importDetails,
      exports: exportDetails,
      summary: {
        total_import_quantity: importDetails.reduce((sum, d) => sum + d.total_quantity, 0),
        total_import_amount: importDetails.reduce((sum, d) => sum + d.total_amount, 0),
        total_export_quantity: groupTotals.reduce((sum, d) => sum + d.total_quantity, 0),
        total_revenue: groupTotals.reduce((sum, d) => sum + d.revenue, 0),
        total_cost: groupTotals.reduce((sum, d) => sum + d.cost, 0),
        total_profit: groupTotals.reduce((sum, d) => sum + d.profit, 0),
      },
    };
    console.log(`[InventoryReport] Report generated: ${importDetails.length} imports, ${exportDetails.length} export lines`);
    return result;
    } catch (error) {
      console.error('[InventoryReport] Error generating report:', error);
      throw error;
    }
  }

  private addExportData(record: ExportDetailDto, item: ExportOrderItem, batch: ImportBatch | null): void {
    if (!batch || !batch.product) {
      console.warn(`[InventoryReport] addExportData: Batch or product is null`);
      return;
    }

    const productName = batch.product.name.toUpperCase();
    const itemQty = Number(item.quantity) || 0;
    const itemRevenue = Number(item.total_amount) || 0;
    const unitPrice = Number(batch.unit_price) || 0;
    const itemCost = itemQty * unitPrice;
    const itemProfit = itemRevenue - itemCost;

    console.log(`[addExportData] product="${batch.product.name}" (${productName}), qty=${itemQty}, revenue=${itemRevenue}, cost=${itemCost}`);

    // Match sản phẩm vào category
    // A95/RON95
    if (productName.includes('A95') || productName.includes('95')) {
      console.log(`  → Export matched to A95`);
      record.quantity_a95 += itemQty;
      record.revenue_a95 += itemRevenue;
      record.profit_a95 += itemProfit;
    }
    // E5
    else if (productName.includes('E5')) {
      console.log(`  → Export matched to E5`);
      record.quantity_e5 += itemQty;
      record.revenue_e5 += itemRevenue;
      record.profit_e5 += itemProfit;
    }
    // DO 0.001 (kiểm tra cụ thể trước DO chung)
    else if ((productName.includes('DO') || productName.includes('DẦU') || productName.includes('DIESEL')) &&
             (productName.includes('0.001') || productName.includes('0,001'))) {
      console.log(`  → Export matched to DO001`);
      record.quantity_do001 += itemQty;
      record.revenue_do001 += itemRevenue;
    }
    // DO chung (Diesel Oil)
    else if (productName.includes('DO') || productName.includes('DẦU') || productName.includes('DIESEL')) {
      console.log(`  → Export matched to DO`);
      record.quantity_do += itemQty;
      record.revenue_do += itemRevenue;
      record.profit_do += itemProfit;
    } else {
      console.log(`  ⚠ Export NO MATCH - Product unmapped`);
    }

    record.total_quantity += itemQty;
    record.revenue += itemRevenue;
    record.cost += itemCost;
    record.profit += itemProfit;
  }

  async getBatchReport(
    startDate: string,
    endDate: string,
    warehouseId?: number,
    supplierId?: number,
  ): Promise<BatchReportDto> {
    try {
      // Get all batches in the period
      const batchesQuery = this.importBatchRepo
        .createQueryBuilder('batch')
        .leftJoinAndSelect('batch.warehouse', 'warehouse')
        .leftJoinAndSelect('batch.product', 'product')
        .leftJoinAndSelect('batch.supplier', 'supplier')
        .where('batch.import_date BETWEEN :startDate AND :endDate', { startDate, endDate });

      if (warehouseId) {
        batchesQuery.andWhere('batch.warehouse_id = :warehouseId', { warehouseId });
      }

      if (supplierId) {
        batchesQuery.andWhere('batch.supplier_id = :supplierId', { supplierId });
      }

      const batches = await batchesQuery.orderBy('batch.import_date', 'ASC').getMany();
      console.log(`[BatchReport] Found ${batches.length} batches from ${startDate} to ${endDate}`);

      // Get all exports for these batches
      const exportsQuery = this.exportOrderItemRepo
        .createQueryBuilder('item')
        .leftJoinAndSelect('item.export_order', 'order')
        .where('order.order_date BETWEEN :startDate AND :endDate', { startDate, endDate });

      const exports = await exportsQuery.getMany();
      console.log(`[BatchReport] Found ${exports.length} exports from ${startDate} to ${endDate}`);

      // Group exports by batch_id
      const exportsByBatch = new Map<number, ExportOrderItem[]>();
      exports.forEach(item => {
        if (!exportsByBatch.has(item.import_batch_id)) {
          exportsByBatch.set(item.import_batch_id, []);
        }
        exportsByBatch.get(item.import_batch_id)!.push(item);
      });

      const batchDetails: BatchDetailDto[] = batches.map(batch => {
        // Validate batch data
        if (!batch.warehouse || !batch.product) {
          console.warn(`[BatchReport] Skipping batch ${batch.id} - missing warehouse or product`);
          return null as any;
        }

        const batchExports = exportsByBatch.get(batch.id) || [];

      // Calculate export totals
      const exportQuantity = batchExports.reduce((sum, item) => sum + Number(item.quantity), 0);
      const exportTotal = batchExports.reduce((sum, item) => sum + Number(item.total_amount), 0);
      const exportCost = batchExports.reduce((sum, item) => sum + (Number(item.quantity) * Number(batch.unit_price)), 0);
      const exportProfit = exportTotal - exportCost;

      // Calculate closing inventory
      const closingQuantity = Number(batch.import_quantity) - exportQuantity;
      const closingTotal = closingQuantity * Number(batch.unit_price);

      return {
        batch_id: batch.id,
        batch_code: batch.batch_code || `BATCH-${batch.id}`,
        import_date: batch.import_date.toISOString().split('T')[0],
        product_name: batch.product.name,
        supplier_name: batch.supplier?.name || 'N/A',
        warehouse_name: batch.warehouse.name,
        // Import
        import_quantity: Number(batch.import_quantity) || 0,
        import_discount: Number(batch.discount_amount) || 0,
        import_eco_fee: 0,
        import_env_tax: Number(batch.environmental_tax_amount) || 0,
        import_total: Number(batch.import_quantity) * Number(batch.unit_price),
        // Export
        export_unit: 'Lít',
        export_quantity: exportQuantity,
        export_discount: 0, // TODO: calculate from items
        export_eco_fee: 0,
        export_total: exportTotal,
        export_env_tax: 0,
        export_profit: exportProfit,
        // Closing
        closing_quantity: closingQuantity,
        closing_total: closingTotal,
        note: '',
      };
      }).filter(b => b !== null);

      const result = {
        batches: batchDetails,
        summary: {
          total_import_quantity: batchDetails.reduce((sum, b) => sum + b.import_quantity, 0),
          total_import_amount: batchDetails.reduce((sum, b) => sum + b.import_total, 0),
          total_export_quantity: batchDetails.reduce((sum, b) => sum + b.export_quantity, 0),
          total_export_amount: batchDetails.reduce((sum, b) => sum + b.export_total, 0),
          total_closing_quantity: batchDetails.reduce((sum, b) => sum + b.closing_quantity, 0),
          total_closing_amount: batchDetails.reduce((sum, b) => sum + b.closing_total, 0),
          total_profit: batchDetails.reduce((sum, b) => sum + b.export_profit, 0),
        },
      };
      console.log(`[BatchReport] Report generated: ${batchDetails.length} batches`);
      return result;
    } catch (error) {
      console.error('[BatchReport] Error generating report:', error);
      throw error;
    }
  }
}
