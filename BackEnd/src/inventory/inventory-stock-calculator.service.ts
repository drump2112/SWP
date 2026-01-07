import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventoryLedger } from '../entities/inventory-ledger.entity';

/**
 * Service tính toán tồn kho từ InventoryLedger
 * SINGLE SOURCE OF TRUTH cho tồn kho
 */
@Injectable()
export class InventoryStockCalculatorService {
  constructor(
    @InjectRepository(InventoryLedger)
    private inventoryLedgerRepository: Repository<InventoryLedger>,
  ) {}

  /**
   * Lấy tồn kho hiện tại của một bể cụ thể
   */
  async getTankCurrentStock(tankId: number): Promise<number> {
    const result = await this.inventoryLedgerRepository
      .createQueryBuilder('il')
      .select('COALESCE(SUM(il.quantity_in - il.quantity_out), 0)', 'balance')
      .where('il.tank_id = :tankId', { tankId })
      .andWhere('il.superseded_by_shift_id IS NULL') // ✅ Filter superseded records
      .getRawOne();

    return Number(result?.balance || 0);
  }

  /**
   * Lấy tồn kho của nhiều bể cùng lúc
   */
  async getTanksCurrentStock(tankIds: number[]): Promise<Map<number, number>> {
    if (!tankIds || tankIds.length === 0) {
      return new Map();
    }

    const results = await this.inventoryLedgerRepository
      .createQueryBuilder('il')
      .select('il.tank_id', 'tankId')
      .addSelect('COALESCE(SUM(il.quantity_in - il.quantity_out), 0)', 'balance')
      .where('il.tank_id IN (:...tankIds)', { tankIds })
      .andWhere('il.superseded_by_shift_id IS NULL') // ✅ Filter superseded records
      .groupBy('il.tank_id')
      .getRawMany();

    const stockMap = new Map<number, number>();
    results.forEach((row) => {
      stockMap.set(Number(row.tankId), Number(row.balance));
    });

    // Thêm các tank không có giao dịch (tồn = 0)
    tankIds.forEach((id) => {
      if (!stockMap.has(id)) {
        stockMap.set(id, 0);
      }
    });

    return stockMap;
  }

  /**
   * Lấy tồn kho theo kho và sản phẩm
   */
  async getWarehouseProductStock(
    warehouseId: number,
    productId: number,
  ): Promise<number> {
    const result = await this.inventoryLedgerRepository
      .createQueryBuilder('il')
      .select('COALESCE(SUM(il.quantity_in - il.quantity_out), 0)', 'balance')
      .where('il.warehouse_id = :warehouseId', { warehouseId })
      .andWhere('il.product_id = :productId', { productId })
      .andWhere('il.superseded_by_shift_id IS NULL') // ✅ Filter superseded records
      .getRawOne();

    return Number(result?.balance || 0);
  }

  /**
   * Lấy tồn kho tất cả sản phẩm trong kho
   */
  async getWarehouseAllProductsStock(warehouseId: number): Promise<
    Array<{
      productId: number;
      productCode: string;
      productName: string;
      balance: number;
    }>
  > {
    const results = await this.inventoryLedgerRepository
      .createQueryBuilder('il')
      .select('il.product_id', 'productId')
      .addSelect('p.code', 'productCode')
      .addSelect('p.name', 'productName')
      .addSelect('COALESCE(SUM(il.quantity_in - il.quantity_out), 0)', 'balance')
      .leftJoin('products', 'p', 'p.id = il.product_id')
      .where('il.warehouse_id = :warehouseId', { warehouseId })
      .andWhere('il.superseded_by_shift_id IS NULL') // ✅ Filter superseded records
      .groupBy('il.product_id, p.code, p.name')
      .having('COALESCE(SUM(il.quantity_in - il.quantity_out), 0) > 0')
      .getRawMany();

    return results.map((row) => ({
      productId: Number(row.productId),
      productCode: row.productCode,
      productName: row.productName,
      balance: Number(row.balance),
    }));
  }

  /**
   * Lấy tồn kho tất cả bể trong một cửa hàng
   */
  async getStoreTanksStock(storeId: number): Promise<
    Array<{
      tankId: number;
      tankCode: string;
      tankName: string;
      productId: number;
      productCode: string;
      productName: string;
      capacity: number;
      currentStock: number;
      fillPercentage: number;
    }>
  > {
    const results = await this.inventoryLedgerRepository
      .createQueryBuilder('il')
      .select('il.tank_id', 'tankId')
      .addSelect('t.tank_code', 'tankCode')
      .addSelect('t.name', 'tankName')
      .addSelect('t.capacity', 'capacity')
      .addSelect('il.product_id', 'productId')
      .addSelect('p.code', 'productCode')
      .addSelect('p.name', 'productName')
      .addSelect('COALESCE(SUM(il.quantity_in - il.quantity_out), 0)', 'currentStock')
      .leftJoin('tanks', 't', 't.id = il.tank_id')
      .leftJoin('products', 'p', 'p.id = il.product_id')
      .where('t.store_id = :storeId', { storeId })
      .andWhere('t.is_active = true')
      .andWhere('il.superseded_by_shift_id IS NULL') // ✅ Filter superseded records
      .groupBy('il.tank_id, t.tank_code, t.name, t.capacity, il.product_id, p.code, p.name')
      .getRawMany();

    return results.map((row) => {
      const currentStock = Number(row.currentStock || 0);
      const capacity = Number(row.capacity || 1);
      return {
        tankId: Number(row.tankId),
        tankCode: row.tankCode,
        tankName: row.tankName,
        productId: Number(row.productId),
        productCode: row.productCode,
        productName: row.productName,
        capacity: capacity,
        currentStock: currentStock,
        fillPercentage: capacity > 0 ? (currentStock / capacity) * 100 : 0,
      };
    });
  }

  /**
   * Lấy tồn kho theo kho với breakdown theo bể
   */
  async getWarehouseStockByTank(warehouseId: number): Promise<
    Array<{
      tankId: number | null;
      tankCode: string | null;
      productId: number;
      productCode: string;
      productName: string;
      balance: number;
    }>
  > {
    const results = await this.inventoryLedgerRepository
      .createQueryBuilder('il')
      .select('il.tank_id', 'tankId')
      .addSelect('t.tank_code', 'tankCode')
      .addSelect('il.product_id', 'productId')
      .addSelect('p.code', 'productCode')
      .addSelect('p.name', 'productName')
      .addSelect('COALESCE(SUM(il.quantity_in - il.quantity_out), 0)', 'balance')
      .leftJoin('tanks', 't', 't.id = il.tank_id')
      .leftJoin('products', 'p', 'p.id = il.product_id')
      .where('il.warehouse_id = :warehouseId', { warehouseId })
      .andWhere('il.superseded_by_shift_id IS NULL') // ✅ Filter superseded records
      .groupBy('il.tank_id, t.tank_code, il.product_id, p.code, p.name')
      .having('COALESCE(SUM(il.quantity_in - il.quantity_out), 0) != 0')
      .getRawMany();

    return results.map((row) => ({
      tankId: row.tankId ? Number(row.tankId) : null,
      tankCode: row.tankCode,
      productId: Number(row.productId),
      productCode: row.productCode,
      productName: row.productName,
      balance: Number(row.balance),
    }));
  }

  /**
   * Kiểm tra xem có đủ hàng để xuất không
   */
  async canExportFromTank(
    tankId: number,
    quantity: number,
  ): Promise<{ canExport: boolean; currentStock: number; shortage: number }> {
    const currentStock = await this.getTankCurrentStock(tankId);
    const canExport = currentStock >= quantity;
    const shortage = canExport ? 0 : quantity - currentStock;

    return {
      canExport,
      currentStock,
      shortage,
    };
  }

  /**
   * Kiểm tra xem có vượt quá dung tích bể không
   */
  async willExceedCapacity(
    tankId: number,
    additionalQuantity: number,
  ): Promise<{ willExceed: boolean; currentStock: number; capacity: number; available: number }> {
    const currentStock = await this.getTankCurrentStock(tankId);

    // Lấy thông tin capacity từ tank
    const tankInfo = await this.inventoryLedgerRepository.manager.query(
      'SELECT capacity FROM tanks WHERE id = ?',
      [tankId],
    );

    const capacity = tankInfo && tankInfo[0] ? Number(tankInfo[0].capacity) : 0;
    const available = capacity - currentStock;
    const willExceed = (currentStock + additionalQuantity) > capacity;

    return {
      willExceed,
      currentStock,
      capacity,
      available,
    };
  }
}
