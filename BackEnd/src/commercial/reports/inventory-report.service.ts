import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ImportBatch } from '../../entities/import-batch.entity';
import { ExportOrderItem } from '../../entities/export-order-item.entity';

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

    // Group imports by supplier and product
    const importMap = new Map<string, ImportDetailDto>();
    imports.forEach((batch) => {
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

      if (productName.includes('A95') || productName.includes('95')) {
        record.quantity_a95 += batch.import_quantity;
      } else if (productName.includes('E5')) {
        record.quantity_e5 += batch.import_quantity;
      } else if (productName.includes('DO') && productName.includes('0.001')) {
        record.quantity_do001 += batch.import_quantity;
      } else if (productName.includes('DO')) {
        record.quantity_do += batch.import_quantity;
      }

      record.total_quantity += batch.import_quantity;
      record.total_amount += batch.import_quantity * batch.unit_price;
    });

    // Group exports by customer group AND individual customers
    const exportGroupMap = new Map<string, ExportDetailDto>(); // Group totals
    const exportCustomerMap = new Map<string, ExportDetailDto>(); // Individual customers

    exports.forEach((item) => {
      const batch = item.import_batch;
      const customer = item.customer;
      const groupId = customer?.customer_group_id || null;
      const groupName = customer?.customer_group?.name || 'Khác';

      // Create/update group total
      if (groupId) {
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
      }

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

    return {
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
  }

  private addExportData(record: ExportDetailDto, item: ExportOrderItem, batch: ImportBatch): void {
    const productName = batch.product.name.toUpperCase();
    const itemRevenue = item.total_amount;
    const itemCost = item.quantity * batch.unit_price;
    const itemProfit = itemRevenue - itemCost;

    if (productName.includes('A95') || productName.includes('95')) {
      record.quantity_a95 += item.quantity;
      record.revenue_a95 += itemRevenue;
      record.profit_a95 += itemProfit;
    } else if (productName.includes('E5')) {
      record.quantity_e5 += item.quantity;
      record.revenue_e5 += itemRevenue;
      record.profit_e5 += itemProfit;
    } else if (productName.includes('DO') && productName.includes('0.001')) {
      record.quantity_do001 += item.quantity;
      record.revenue_do001 += itemRevenue;
    } else if (productName.includes('DO')) {
      record.quantity_do += item.quantity;
      record.revenue_do += itemRevenue;
      record.profit_do += itemProfit;
    }

    record.total_quantity += item.quantity;
    record.revenue += itemRevenue;
    record.cost += itemCost;
    record.profit += itemProfit;
  }
}
