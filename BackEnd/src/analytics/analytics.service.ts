import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { Sale } from '../entities/sale.entity';
import { Shift } from '../entities/shift.entity';
import { DebtLedger } from '../entities/debt-ledger.entity';
import { InventoryLedger } from '../entities/inventory-ledger.entity';
import { Store } from '../entities/store.entity';
import { Product } from '../entities/product.entity';
import { Customer } from '../entities/customer.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Sale)
    private saleRepository: Repository<Sale>,
    @InjectRepository(Shift)
    private shiftRepository: Repository<Shift>,
    @InjectRepository(DebtLedger)
    private debtLedgerRepository: Repository<DebtLedger>,
    @InjectRepository(InventoryLedger)
    private inventoryLedgerRepository: Repository<InventoryLedger>,
    @InjectRepository(Store)
    private storeRepository: Repository<Store>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
  ) {}

  /**
   * Tổng quan metrics quan trọng
   */
  async getOverview(params: { fromDate?: Date; toDate?: Date }) {
    const { fromDate, toDate } = params;

    const now = new Date();
    const effectiveFromDate = fromDate || new Date(now.getFullYear(), now.getMonth(), 1);
    const effectiveToDate = toDate || now;

    // Tính kỳ trước để so sánh
    const daysDiff = Math.ceil((effectiveToDate.getTime() - effectiveFromDate.getTime()) / (1000 * 60 * 60 * 24));
    const previousFromDate = new Date(effectiveFromDate);
    previousFromDate.setDate(previousFromDate.getDate() - daysDiff);
    const previousToDate = new Date(effectiveFromDate);
    previousToDate.setDate(previousToDate.getDate() - 1);

    // Tổng doanh thu kỳ này
    const currentRevenue = await this.saleRepository
      .createQueryBuilder('sale')
      .innerJoin('sale.shift', 'shift')
      .select('SUM(sale.amount)', 'total')
      .where('shift.closed_at BETWEEN :fromDate AND :toDate', {
        fromDate: effectiveFromDate,
        toDate: effectiveToDate,
      })
      .getRawOne();

    // Tổng doanh thu kỳ trước
    const previousRevenue = await this.saleRepository
      .createQueryBuilder('sale')
      .innerJoin('sale.shift', 'shift')
      .select('SUM(sale.amount)', 'total')
      .where('shift.closed_at BETWEEN :fromDate AND :toDate', {
        fromDate: previousFromDate,
        toDate: previousToDate,
      })
      .getRawOne();

    // Số lượng ca đã chốt
    const currentShifts = await this.shiftRepository.count({
      where: {
        status: 'CLOSED',
        closedAt: Between(effectiveFromDate, effectiveToDate),
      },
    });

    const previousShifts = await this.shiftRepository.count({
      where: {
        status: 'CLOSED',
        closedAt: Between(previousFromDate, previousToDate),
      },
    });

    // Số giao dịch bán hàng
    const currentSalesResult = await this.saleRepository
      .createQueryBuilder('sale')
      .innerJoin('sale.shift', 'shift')
      .where('shift.closed_at BETWEEN :fromDate AND :toDate', {
        fromDate: effectiveFromDate,
        toDate: effectiveToDate,
      })
      .getCount();
    const currentSalesCount = currentSalesResult;

    const previousSalesResult = await this.saleRepository
      .createQueryBuilder('sale')
      .innerJoin('sale.shift', 'shift')
      .where('shift.closed_at BETWEEN :fromDate AND :toDate', {
        fromDate: previousFromDate,
        toDate: previousToDate,
      })
      .getCount();
    const previousSalesCount = previousSalesResult;

    // Số khách hàng công nợ
    const debtCustomers = await this.debtLedgerRepository
      .createQueryBuilder('dl')
      .select('COUNT(DISTINCT dl.customer_id)', 'count')
      .where('dl.debit > dl.credit')
      .getRawOne();

    // Tổng giá trị công nợ
    const totalDebt = await this.debtLedgerRepository
      .createQueryBuilder('dl')
      .select('SUM(dl.debit - dl.credit)', 'total')
      .getRawOne();

    const currentRevenueValue = Number(currentRevenue?.total || 0);
    const previousRevenueValue = Number(previousRevenue?.total || 0);
    const revenueChange = previousRevenueValue > 0
      ? ((currentRevenueValue - previousRevenueValue) / previousRevenueValue) * 100
      : 0;

    const shiftsChange = previousShifts > 0
      ? ((currentShifts - previousShifts) / previousShifts) * 100
      : 0;

    const salesChange = previousSalesCount > 0
      ? ((currentSalesCount - previousSalesCount) / previousSalesCount) * 100
      : 0;

    return {
      revenue: {
        current: currentRevenueValue,
        previous: previousRevenueValue,
        change: revenueChange,
      },
      shifts: {
        current: currentShifts,
        previous: previousShifts,
        change: shiftsChange,
      },
      sales: {
        current: currentSalesCount,
        previous: previousSalesCount,
        change: salesChange,
      },
      debt: {
        customersCount: Number(debtCustomers?.count || 0),
        totalAmount: Number(totalDebt?.total || 0),
      },
    };
  }

  /**
   * Doanh thu theo tháng (6-12 tháng gần nhất)
   */
  async getMonthlyRevenue(months: number = 6, storeId?: number) {
    const now = new Date();
    const results: Array<{
      month: string;
      year: number;
      monthNumber: number;
      revenue: number;
    }> = [];

    for (let i = months - 1; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
      const endDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59);

      const query = this.saleRepository
        .createQueryBuilder('sale')
        .innerJoin('sale.shift', 'shift')
        .select('SUM(sale.amount)', 'revenue')
        .where('shift.closed_at BETWEEN :startDate AND :endDate', {
          startDate,
          endDate,
        });

      if (storeId) {
        query.andWhere('sale.store_id = :storeId', { storeId });
      }

      const result = await query.getRawOne();

      results.push({
        month: targetDate.toISOString().substring(0, 7), // YYYY-MM
        year: targetDate.getFullYear(),
        monthNumber: targetDate.getMonth() + 1,
        revenue: Number(result?.revenue || 0),
      });
    }

    return results;
  }

  /**
   * So sánh doanh thu giữa các cửa hàng
   */
  async getRevenueByStore(fromDate: Date, toDate: Date) {
    const stores = await this.storeRepository.find({
      order: { id: 'ASC' },
    });

    const results = await Promise.all(
      stores.map(async (store) => {
        const revenue = await this.saleRepository
          .createQueryBuilder('sale')
          .select('SUM(sale.amount)', 'total')
          .innerJoin('sale.shift', 'shift')
          .where('sale.store_id = :storeId', { storeId: store.id })
          .andWhere('shift.closed_at BETWEEN :fromDate AND :toDate', {
            fromDate,
            toDate,
          })
          .getRawOne();

        const salesCount = await this.saleRepository
          .createQueryBuilder('sale')
          .innerJoin('sale.shift', 'shift')
          .where('sale.store_id = :storeId', { storeId: store.id })
          .andWhere('shift.closed_at BETWEEN :fromDate AND :toDate', {
            fromDate,
            toDate,
          })
          .getCount();

        return {
          storeId: store.id,
          storeName: store.name,
          storeCode: store.code,
          revenue: Number(revenue?.total || 0),
          salesCount,
        };
      }),
    );

    return results;
  }

  /**
   * Xu hướng doanh thu của từng cửa hàng qua các tháng
   */
  async getStoreTrends(months: number = 6) {
    const stores = await this.storeRepository.find({
      order: { id: 'ASC' },
    });

    const now = new Date();
    const monthsData: Array<{
      month: string;
      year: number;
      monthNumber: number;
    }> = [];

    // Tạo danh sách các tháng
    for (let i = months - 1; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthsData.push({
        month: targetDate.toISOString().substring(0, 7),
        year: targetDate.getFullYear(),
        monthNumber: targetDate.getMonth() + 1,
      });
    }

    // Lấy doanh thu cho từng cửa hàng trong từng tháng
    const results = await Promise.all(
      stores.map(async (store) => {
        const monthlyRevenues = await Promise.all(
          monthsData.map(async (monthInfo) => {
            const startDate = new Date(monthInfo.year, monthInfo.monthNumber - 1, 1);
            const endDate = new Date(monthInfo.year, monthInfo.monthNumber, 0, 23, 59, 59);

            const revenue = await this.saleRepository
              .createQueryBuilder('sale')
              .innerJoin('sale.shift', 'shift')
              .select('SUM(sale.amount)', 'total')
              .where('sale.store_id = :storeId', { storeId: store.id })
              .andWhere('shift.closed_at BETWEEN :startDate AND :endDate', {
                startDate,
                endDate,
              })
              .getRawOne();

            return {
              month: monthInfo.month,
              revenue: Number(revenue?.total || 0),
            };
          }),
        );

        return {
          storeId: store.id,
          storeName: store.name,
          storeCode: store.code,
          data: monthlyRevenues,
        };
      }),
    );

    return {
      months: monthsData.map(m => m.month),
      stores: results,
    };
  }

  /**
   * Tổng giá trị hàng tồn kho
   */
  async getTotalInventoryValue() {
    // Lấy tất cả sản phẩm và tính tồn kho từ inventory_ledger
    const products = await this.productRepository.find();

    const inventoryByProduct = await Promise.all(
      products.map(async (product) => {
        const balance = await this.inventoryLedgerRepository
          .createQueryBuilder('il')
          .select('SUM(il.quantity_in - il.quantity_out)', 'balance')
          .where('il.product_id = :productId', { productId: product.id })
          .getRawOne();

        const quantity = Number(balance?.balance || 0);

        // TODO: Get unit cost from product or latest purchase price
        const unitCost = 0;

        return {
          productId: product.id,
          productName: product.name,
          quantity,
          unitCost,
          totalValue: quantity * unitCost,
        };
      }),
    );

    const totalValue = inventoryByProduct.reduce((sum, item) => sum + item.totalValue, 0);

    // Nhóm theo kho/chi nhánh
    const stores = await this.storeRepository.find();
    const byStore = await Promise.all(
      stores.map(async (store) => {
        // TODO: Tính giá trị tồn kho khi có unit_cost trong inventory_ledger
        // Hiện tại chỉ đếm số lượng tồn kho
        const storeInventory = await this.inventoryLedgerRepository
          .createQueryBuilder('il')
          .leftJoin('il.warehouse', 'w')
          .select('SUM(il.quantity_in - il.quantity_out)', 'quantity')
          .where('w.store_id = :storeId', { storeId: store.id })
          .getRawOne();

        // Set giá trị tạm = 0 vì chưa có unit_cost
        const totalValue = 0; // TODO: Calculate when unit_cost available

        return {
          storeId: store.id,
          storeName: store.name,
          totalValue,
          quantity: Number(storeInventory?.quantity || 0),
        };
      }),
    );

    return {
      totalValue,
      byStore,
      byProduct: inventoryByProduct.filter(item => item.quantity > 0).slice(0, 20),
    };
  }

  /**
   * Top sản phẩm tồn kho nhiều nhất
   */
  async getInventoryByProduct(limit: number = 10) {
    const products = await this.productRepository.find();

    const inventoryData = await Promise.all(
      products.map(async (product) => {
        const balance = await this.inventoryLedgerRepository
          .createQueryBuilder('il')
          .select('SUM(il.quantity_in - il.quantity_out)', 'balance')
          .where('il.product_id = :productId', { productId: product.id })
          .getRawOne();

        const quantity = Number(balance?.balance || 0);

        // TODO: Get unit cost from product or latest purchase price
        const unitCost = 0;

        return {
          productId: product.id,
          productName: product.name,
          productCode: product.code,
          unit: product.unit,
          quantity,
          unitCost,
          totalValue: quantity * unitCost,
        };
      }),
    );

    return inventoryData
      .filter(item => item.quantity > 0)
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, limit);
  }

  /**
   * Top sản phẩm bán chạy nhất
   */
  async getTopProducts(fromDate: Date, toDate: Date, limit: number = 10) {
    const topProducts = await this.saleRepository
      .createQueryBuilder('sale')
      .innerJoin('sale.shift', 'shift')
      .select('sale.product_id', 'productId')
      .addSelect('SUM(sale.quantity)', 'totalQuantity')
      .addSelect('SUM(sale.amount)', 'totalRevenue')
      .addSelect('COUNT(sale.id)', 'salesCount')
      .where('shift.status = :status', { status: 'CLOSED' })
      .andWhere('shift.closed_at BETWEEN :fromDate AND :toDate', { fromDate, toDate })
      .groupBy('sale.product_id')
      .orderBy('SUM(sale.amount)', 'DESC')
      .limit(limit)
      .getRawMany();

    const results = await Promise.all(
      topProducts.map(async (item) => {
        const product = await this.productRepository.findOne({
          where: { id: item.productId },
        });

        return {
          productId: item.productId,
          productName: product?.name || 'N/A',
          productCode: product?.code || 'N/A',
          totalQuantity: Number(item.totalQuantity),
          totalRevenue: Number(item.totalRevenue),
          salesCount: Number(item.salesCount),
        };
      }),
    );

    return results;
  }

  /**
   * Tổng quan công nợ
   */
  async getDebtSummary() {
    // Tổng công nợ phải thu
    const totalDebt = await this.debtLedgerRepository
      .createQueryBuilder('dl')
      .select('SUM(dl.debit - dl.credit)', 'total')
      .getRawOne();

    // Số lượng khách hàng có công nợ
    const customersWithDebt = await this.debtLedgerRepository
      .createQueryBuilder('dl')
      .select('COUNT(DISTINCT dl.customer_id)', 'count')
      .where('dl.debit > dl.credit')
      .getRawOne();

    // Top khách hàng nợ nhiều nhất
    const topDebtors = await this.debtLedgerRepository
      .createQueryBuilder('dl')
      .select('dl.customer_id', 'customerId')
      .addSelect('SUM(dl.debit - dl.credit)', 'debtAmount')
      .groupBy('dl.customer_id')
      .having('SUM(dl.debit - dl.credit) > 0')
      .orderBy('SUM(dl.debit - dl.credit)', 'DESC')
      .limit(10)
      .getRawMany();

    const topDebtorsWithDetails = await Promise.all(
      topDebtors.map(async (item) => {
        const customer = await this.customerRepository.findOne({
          where: { id: item.customerId },
        });

        return {
          customerId: item.customerId,
          customerName: customer?.name || 'N/A',
          customerCode: customer?.code || 'N/A',
          debtAmount: Number(item.debtAmount),
        };
      }),
    );

    return {
      totalDebt: Number(totalDebt?.total || 0),
      customersCount: Number(customersWithDebt?.count || 0),
      topDebtors: topDebtorsWithDetails,
    };
  }

  /**
   * Hiệu suất hoạt động của các cửa hàng
   */
  async getStorePerformance(fromDate: Date, toDate: Date) {
    const stores = await this.storeRepository.find({
      order: { id: 'ASC' },
    });

    const results = await Promise.all(
      stores.map(async (store) => {
        // Doanh thu
        const revenue = await this.saleRepository
          .createQueryBuilder('sale')
          .select('SUM(sale.amount)', 'total')
          .innerJoin('sale.shift', 'shift')
          .where('sale.store_id = :storeId', { storeId: store.id })
          .andWhere('shift.closed_at BETWEEN :fromDate AND :toDate', {
            fromDate,
            toDate,
          })
          .getRawOne();

        // Số ca đã chốt
        const shiftsCount = await this.shiftRepository.count({
          where: {
            storeId: store.id,
            status: 'CLOSED',
            closedAt: Between(fromDate, toDate),
          },
        });

        // Số giao dịch
        const salesCount = await this.saleRepository
          .createQueryBuilder('sale')
          .innerJoin('sale.shift', 'shift')
          .where('sale.store_id = :storeId', { storeId: store.id })
          .andWhere('shift.closed_at BETWEEN :fromDate AND :toDate', {
            fromDate,
            toDate,
          })
          .getCount();

        // Trung bình doanh thu mỗi ca
        const avgRevenuePerShift = shiftsCount > 0
          ? Number(revenue?.total || 0) / shiftsCount
          : 0;

        return {
          storeId: store.id,
          storeName: store.name,
          storeCode: store.code,
          revenue: Number(revenue?.total || 0),
          shiftsCount,
          salesCount,
          avgRevenuePerShift,
        };
      }),
    );

    return results;
  }

  async getQuantityByStoreAndProduct(fromDate: Date, toDate: Date) {
    // Get all stores
    const stores = await this.storeRepository.find({
      order: { name: 'ASC' },
    });

    // Get all products
    const products = await this.productRepository.find({
      order: { name: 'ASC' },
    });

    // Get sales data grouped by store and product
    const salesData = await this.saleRepository
      .createQueryBuilder('sale')
      .select('sale.store_id', 'storeId')
      .addSelect('sale.product_id', 'productId')
      .addSelect('SUM(sale.quantity)', 'totalQuantity')
      .innerJoin('sale.shift', 'shift')
      .where('shift.closed_at BETWEEN :fromDate AND :toDate', {
        fromDate,
        toDate,
      })
      .andWhere('shift.status = :status', { status: 'CLOSED' })
      .groupBy('sale.store_id')
      .addGroupBy('sale.product_id')
      .getRawMany();

    // Create lookup map for quick access
    const salesMap = new Map<string, number>();
    salesData.forEach((item) => {
      const key = `${item.storeId}-${item.productId}`;
      salesMap.set(key, Number(item.totalQuantity || 0));
    });

    // Build result structure
    const results = stores.map((store) => {
      const productQuantities: Record<string, number> = {};
      let totalQuantity = 0;

      products.forEach((product) => {
        const key = `${store.id}-${product.id}`;
        const quantity = salesMap.get(key) || 0;
        productQuantities[product.name] = quantity;
        totalQuantity += quantity;
      });

      return {
        storeId: store.id,
        storeName: store.name,
        storeCode: store.code,
        productQuantities,
        totalQuantity,
      };
    });

    // Return products list for table headers
    return {
      products: products.map((p) => ({ id: p.id, name: p.name })),
      storeData: results,
    };
  }
}
