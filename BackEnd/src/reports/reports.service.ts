import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { DebtLedger } from '../entities/debt-ledger.entity';
import { Sale } from '../entities/sale.entity';
import { CashLedger } from '../entities/cash-ledger.entity';
import { InventoryLedger } from '../entities/inventory-ledger.entity';
import { Shift } from '../entities/shift.entity';
import { Customer } from '../entities/customer.entity';
import { Store } from '../entities/store.entity';
import { ShiftDebtSale } from '../entities/shift-debt-sale.entity';
import { Receipt } from '../entities/receipt.entity';
import { CashDeposit } from '../entities/cash-deposit.entity';
import { PumpReading } from '../entities/pump-reading.entity';
import { InventoryDocument } from '../entities/inventory-document.entity';
import { InventoryDocumentItem } from '../entities/inventory-document-item.entity';
import { Product } from '../entities/product.entity';
import { Warehouse } from '../entities/warehouse.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(DebtLedger)
    private debtLedgerRepository: Repository<DebtLedger>,
    @InjectRepository(Sale)
    private saleRepository: Repository<Sale>,
    @InjectRepository(CashLedger)
    private cashLedgerRepository: Repository<CashLedger>,
    @InjectRepository(InventoryLedger)
    private inventoryLedgerRepository: Repository<InventoryLedger>,
    @InjectRepository(Shift)
    private shiftRepository: Repository<Shift>,
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    @InjectRepository(Store)
    private storeRepository: Repository<Store>,
    @InjectRepository(ShiftDebtSale)
    private shiftDebtSaleRepository: Repository<ShiftDebtSale>,
    @InjectRepository(Receipt)
    private receiptRepository: Repository<Receipt>,
    @InjectRepository(CashDeposit)
    private cashDepositRepository: Repository<CashDeposit>,
    @InjectRepository(PumpReading)
    private pumpReadingRepository: Repository<PumpReading>,
    @InjectRepository(InventoryDocument)
    private inventoryDocumentRepository: Repository<InventoryDocument>,
    @InjectRepository(InventoryDocumentItem)
    private inventoryDocumentItemRepository: Repository<InventoryDocumentItem>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Warehouse)
    private warehouseRepository: Repository<Warehouse>,
  ) {}

  // ==================== BÁO CÁO CÔNG NỢ ====================

  /**
   * Báo cáo công nợ chi tiết theo khách hàng
   * - Kế toán: Xem tất cả cửa hàng
   * - Cửa hàng: Chỉ xem khách nợ tại cửa hàng của mình
   */
  async getDebtReport(params: {
    storeId?: number;
    customerId?: number;
    fromDate?: Date;
    toDate?: Date;
  }) {
    const { storeId, customerId, fromDate, toDate } = params;

    // Lấy danh sách ID khách hàng có giao dịch công nợ
    const customerIdsQuery = this.debtLedgerRepository
      .createQueryBuilder('dl')
      .select('DISTINCT dl.customer_id', 'customerId');

    if (storeId) {
      customerIdsQuery.where('dl.store_id = :storeId', { storeId });
    }

    if (customerId) {
      if (storeId) {
        customerIdsQuery.andWhere('dl.customer_id = :customerId', {
          customerId,
        });
      } else {
        customerIdsQuery.where('dl.customer_id = :customerId', { customerId });
      }
    }

    const customerIdsResult = await customerIdsQuery.getRawMany();
    const customerIds = customerIdsResult.map((r) => r.customerId);

    if (customerIds.length === 0) {
      return [];
    }

    // Lấy thông tin khách hàng
    const customers = await this.customerRepository
      .createQueryBuilder('c')
      .where('c.id IN (:...customerIds)', { customerIds })
      .orderBy('c.code', 'ASC')
      .getMany();

    // Lấy chi tiết công nợ cho từng khách hàng
    const results = await Promise.all(
      customers.map(async (customer) => {
        // Lấy dư đầu kỳ (trước fromDate)
        const openingBalance = fromDate
          ? await this.getCustomerBalance(
              customer.id,
              storeId,
              new Date(0),
              fromDate,
            )
          : 0;

        // Lấy phát sinh trong kỳ
        const ledgerQuery = this.debtLedgerRepository
          .createQueryBuilder('dl')
          .where('dl.customer_id = :customerId', { customerId: customer.id });

        if (storeId) {
          ledgerQuery.andWhere('dl.store_id = :storeId', { storeId });
        }

        if (fromDate && toDate) {
          ledgerQuery.andWhere('dl.created_at BETWEEN :fromDate AND :toDate', {
            fromDate,
            toDate,
          });
        }

        const ledgers = await ledgerQuery
          .orderBy('dl.created_at', 'ASC')
          .getMany();

        const totalDebit = ledgers.reduce((sum, l) => sum + Number(l.debit), 0);
        const totalCredit = ledgers.reduce(
          (sum, l) => sum + Number(l.credit),
          0,
        );
        const closingBalance = openingBalance + totalDebit - totalCredit;

        // Lấy chi tiết từ shift_debt_sales để hiển thị sản phẩm, số lượng, giá
        const ledgersWithDetails = await Promise.all(
          ledgers.map(async (l) => {
            let productDetails: null | {
              productName: string;
              quantity: number;
              unitPrice: number;
              amount: number;
            } = null;

            if (l.refType === 'DEBT_SALE' && l.refId) {
              const debtSale = await this.shiftDebtSaleRepository.findOne({
                where: { id: l.refId },
                relations: ['product'],
              });

              if (debtSale) {
                productDetails = {
                  productName: debtSale.product?.name || 'N/A',
                  quantity: Number(debtSale.quantity),
                  unitPrice: Number(debtSale.unitPrice),
                  amount: Number(debtSale.amount),
                };
              }
            }

            return {
              id: l.id,
              date: l.createdAt,
              refType: l.refType,
              refId: l.refId,
              debit: Number(l.debit),
              credit: Number(l.credit),
              notes: l.notes,
              productDetails, // Thông tin sản phẩm nếu là DEBT_SALE
            };
          }),
        );

        return {
          customer: {
            id: customer.id,
            code: customer.code,
            name: customer.name,
            phone: customer.phone,
            address: customer.address,
            creditLimit: customer.creditLimit,
          },
          openingBalance, // Dư đầu kỳ
          totalDebit, // Phát sinh nợ (bán công nợ)
          totalCredit, // Phát sinh có (thu tiền)
          closingBalance, // Dư cuối kỳ
          ledgers: ledgersWithDetails,
        };
      }),
    );

    // Lọc chỉ hiển thị khách có phát sinh hoặc dư cuối kỳ
    return results.filter(
      (r) =>
        r.openingBalance !== 0 ||
        r.totalDebit !== 0 ||
        r.totalCredit !== 0 ||
        r.closingBalance !== 0,
    );
  }

  /**
   * Tính số dư công nợ của khách hàng tại 1 thời điểm
   */
  private async getCustomerBalance(
    customerId: number,
    storeId: number | undefined,
    fromDate: Date,
    toDate: Date,
  ): Promise<number> {
    const query = this.debtLedgerRepository
      .createQueryBuilder('dl')
      .select('SUM(dl.debit - dl.credit)', 'balance')
      .where('dl.customer_id = :customerId', { customerId })
      .andWhere('dl.created_at < :toDate', { toDate });

    if (storeId) {
      query.andWhere('dl.store_id = :storeId', { storeId });
    }

    const result = await query.getRawOne();
    return result?.balance ? Number(result.balance) : 0;
  }

  // ==================== BÁO CÁO CA ====================

  /**
   * Báo cáo chi tiết ca làm việc
   */
  async getShiftDetailReport(shiftId: number) {
    const shift = await this.shiftRepository.findOne({
      where: { id: shiftId },
      relations: [
        'store',
        'pumpReadings',
        'pumpReadings.pump',
        'pumpReadings.product',
        'sales',
        'sales.product',
      ],
    });

    if (!shift) {
      throw new Error('Shift not found');
    }

    // Lấy phiếu thu tiền (thanh toán nợ)
    const receipts = await this.cashLedgerRepository.find({
      where: {
        refType: 'RECEIPT',
        // refId sẽ là receipt_id, cần join với receipts table
      },
      relations: ['store'],
    });

    const totalReceipts = receipts
      .filter((r) => {
        // Chỉ lấy receipts trong ca này
        // TODO: Cần thêm shift_id vào receipts table
        return true;
      })
      .reduce((sum, r) => sum + Number(r.cashIn), 0);

    // Lấy phiếu nộp tiền
    const deposits = await this.cashLedgerRepository.find({
      where: {
        refType: 'CASH_DEPOSIT',
        storeId: shift.storeId,
      },
    });

    const totalDeposits = deposits
      .filter((d) => {
        // Chỉ lấy deposits trong ca này
        // TODO: Cần thêm shift_id vào cash_deposits table
        return true;
      })
      .reduce((sum, d) => sum + Number(d.cashOut), 0);

    // Tính toán
    const totalFromPumps = shift.pumpReadings.reduce((sum, reading) => {
      return sum + Number(reading.quantity) * Number(reading.unitPrice || 0);
    }, 0);

    // Lấy doanh số bán công nợ từ shift_debt_sales
    const debtSalesData = await this.shiftDebtSaleRepository.find({
      where: { shiftId },
      relations: ['customer', 'product'],
    });

    const totalDebtSales = debtSalesData.reduce(
      (sum, sale) => sum + Number(sale.amount),
      0,
    );
    const totalRetailSales = totalFromPumps - totalDebtSales;

    return {
      shift: {
        id: shift.id,
        shiftNo: shift.shiftNo,
        shiftDate: shift.shiftDate,
        status: shift.status,
        openedAt: shift.openedAt,
        closedAt: shift.closedAt,
        store: {
          id: shift.store.id,
          code: shift.store.code,
          name: shift.store.name,
        },
      },
      pumpReadings: shift.pumpReadings.map((reading) => ({
        pumpCode: reading.pump.pumpCode,
        pumpName: reading.pump.name,
        productName: reading.product.name,
        startReading: Number(reading.startValue || reading.startReading || 0),
        endReading: Number(reading.endValue || reading.endReading || 0),
        testExport: Number(reading.testExport || 0), // Xuất kiểm thử/Quay kho
        quantity: Number(reading.quantity), // Số lượng BÁN (đã trừ testExport)
        unitPrice: Number(reading.unitPrice),
        amount: Number(reading.quantity) * Number(reading.unitPrice),
      })),
      debtSales: debtSalesData.map((sale) => ({
        customerCode: sale.customer?.code,
        customerName: sale.customer?.name,
        productName: sale.product?.name,
        quantity: Number(sale.quantity),
        unitPrice: Number(sale.unitPrice),
        amount: Number(sale.amount),
      })),
      summary: {
        totalFromPumps, // Tổng từ vòi bơm
        totalDebtSales, // Bán công nợ
        totalRetailSales, // Bán lẻ = Tổng - Công nợ
        totalReceipts, // Thu tiền nợ
        totalDeposits, // Nộp về công ty
        cashBalance: totalRetailSales + totalReceipts - totalDeposits, // Số dư quỹ
      },
    };
  }

  // ==================== CÁC BÁO CÁO KHÁC ====================

  // Báo cáo doanh thu theo cửa hàng
  async getSalesReport(
    fromDate: Date,
    toDate: Date,
    storeIds?: number[],
    productId?: number,
  ) {
    const query = this.saleRepository
      .createQueryBuilder('s')
      .leftJoin('s.shift', 'shift')
      .leftJoin('s.store', 'store')
      .leftJoin('s.product', 'product')
      .select('store.id', 'storeId')
      .addSelect('store.name', 'storeName')
      .addSelect('product.id', 'productId')
      .addSelect('product.name', 'productName')
      .addSelect('SUM(s.quantity)', 'totalQuantity')
      .addSelect('SUM(s.amount)', 'totalAmount')
      .where('shift.shift_date >= :fromDate', { fromDate })
      .andWhere('shift.shift_date <= :toDate', { toDate })
      .groupBy('store.id')
      .addGroupBy('store.name')
      .addGroupBy('product.id')
      .addGroupBy('product.name');

    if (storeIds && storeIds.length > 0) {
      query.andWhere('s.store_id IN (:...storeIds)', { storeIds });
    }

    if (productId) {
      query.andWhere('s.product_id = :productId', { productId });
    }

    return query.getRawMany();
  }

  // ==================== BÁO CÁO SỔ QUỸ TIỀN MẶT ====================

  /**
   * Báo cáo sổ quỹ tiền mặt chi tiết
   * Phản ánh qua phiếu thu và phiếu nộp
   */
  async getCashReport(params: {
    storeId?: number;
    fromDate?: Date;
    toDate?: Date;
  }) {
    const { storeId, fromDate, toDate } = params;

    // Lấy số dư đầu kỳ (trước fromDate)
    const openingBalanceQuery = this.cashLedgerRepository
      .createQueryBuilder('cl')
      .select('SUM(cl.cash_in - cl.cash_out)', 'balance');

    if (storeId) {
      openingBalanceQuery.where('cl.store_id = :storeId', { storeId });
    }

    if (fromDate) {
      openingBalanceQuery.andWhere('cl.created_at < :fromDate', { fromDate });
    }

    const openingBalanceResult = await openingBalanceQuery.getRawOne();
    const openingBalance = Number(openingBalanceResult?.balance || 0);

    // Lấy chi tiết phát sinh trong kỳ
    const ledgerQuery = this.cashLedgerRepository
      .createQueryBuilder('cl')
      .leftJoinAndSelect('cl.store', 'store')
      .orderBy('cl.shift_id', 'ASC')
      .addOrderBy(
        `CASE 
          WHEN cl.ref_type = 'SHIFT_CLOSE' THEN 1 
          WHEN cl.ref_type = 'RECEIPT' THEN 2 
          WHEN cl.ref_type = 'DEPOSIT' THEN 3 
          ELSE 4 
        END`,
        'ASC',
      );

    if (storeId) {
      ledgerQuery.where('cl.store_id = :storeId', { storeId });
    }

    if (fromDate && toDate) {
      if (storeId) {
        ledgerQuery.andWhere('cl.created_at BETWEEN :fromDate AND :toDate', {
          fromDate,
          toDate,
        });
      } else {
        ledgerQuery.where('cl.created_at BETWEEN :fromDate AND :toDate', {
          fromDate,
          toDate,
        });
      }
    }

    const ledgers = await ledgerQuery.getMany();

    // Lấy chi tiết từ receipts và deposits
    const ledgersWithDetails = await Promise.all(
      ledgers.map(async (l) => {
        let details: any = null;

        // Nếu là RECEIPT - lấy thông tin từ bảng receipts
        if (l.refType === 'RECEIPT' && l.refId) {
          const receipt = await this.receiptRepository.findOne({
            where: { id: l.refId },
            relations: ['receiptDetails', 'receiptDetails.customer'],
          });

          if (receipt) {
            details = {
              type: 'RECEIPT',
              receiptType: receipt.receiptType,
              customers:
                receipt.receiptDetails?.map((rd) => ({
                  customerName: rd.customer?.name || 'N/A',
                  amount: Number(rd.amount),
                })) || [],
              totalAmount: Number(receipt.amount),
            };
          }
        }

        // Nếu là DEPOSIT - lấy thông tin từ bảng cash_deposits
        if (l.refType === 'DEPOSIT' && l.refId) {
          const deposit = await this.cashDepositRepository.findOne({
            where: { id: l.refId },
          });

          if (deposit) {
            details = {
              type: 'DEPOSIT',
              depositDate: deposit.depositDate,
              depositTime: deposit.depositTime,
              receiverName: deposit.receiverName,
              amount: Number(deposit.amount),
              notes: deposit.notes,
            };
          }
        }

        return {
          id: l.id,
          date: l.createdAt,
          refType: l.refType,
          refId: l.refId,
          cashIn: Number(l.cashIn),
          cashOut: Number(l.cashOut),
          storeName: l.store?.name || 'N/A',
          details,
        };
      }),
    );

    // Tính toán số dư luỹ kế
    let runningBalance = openingBalance;
    const ledgersWithBalance = ledgersWithDetails.map((l) => {
      runningBalance += l.cashIn - l.cashOut;
      return {
        ...l,
        balance: runningBalance,
      };
    });

    const totalCashIn = ledgers.reduce((sum, l) => sum + Number(l.cashIn), 0);
    const totalCashOut = ledgers.reduce((sum, l) => sum + Number(l.cashOut), 0);
    const closingBalance = openingBalance + totalCashIn - totalCashOut;

    return {
      openingBalance,
      totalCashIn,
      totalCashOut,
      closingBalance,
      ledgers: ledgersWithBalance,
    };
  }

  // Báo cáo tồn kho
  async getInventoryReport(warehouseId?: number) {
    const query = this.inventoryLedgerRepository
      .createQueryBuilder('il')
      .leftJoin('il.warehouse', 'warehouse')
      .leftJoin('il.product', 'product')
      .select('il.warehouse_id', 'warehouseId')
      .addSelect('warehouse.type', 'warehouseType')
      .addSelect('product.id', 'productId')
      .addSelect('product.name', 'productName')
      .addSelect('product.unit', 'unit')
      .addSelect('SUM(il.quantity_in)', 'totalIn')
      .addSelect('SUM(il.quantity_out)', 'totalOut')
      .addSelect('SUM(il.quantity_in - il.quantity_out)', 'balance')
      .groupBy('il.warehouse_id')
      .addGroupBy('warehouse.type')
      .addGroupBy('product.id')
      .addGroupBy('product.name')
      .addGroupBy('product.unit')
      .having('SUM(il.quantity_in - il.quantity_out) != 0');

    if (warehouseId) {
      query.where('il.warehouse_id = :warehouseId', { warehouseId });
    }

    return query.getRawMany();
  }

  // Dashboard tổng quan cho giám đốc
  async getDashboard(fromDate: Date, toDate: Date) {
    const [totalSales, debtSummary, cashSummary, inventorySummary] =
      await Promise.all([
        // Tổng doanh thu
        this.saleRepository
          .createQueryBuilder('s')
          .leftJoin('s.shift', 'shift')
          .select('SUM(s.amount)', 'total')
          .where('shift.shift_date >= :fromDate', { fromDate })
          .andWhere('shift.shift_date <= :toDate', { toDate })
          .getRawOne(),

        // Tổng công nợ
        this.debtLedgerRepository
          .createQueryBuilder('dl')
          .select('SUM(dl.debit - dl.credit)', 'total')
          .getRawOne(),

        // Tổng quỹ tiền mặt
        this.cashLedgerRepository
          .createQueryBuilder('cl')
          .select('SUM(cl.cash_in - cl.cash_out)', 'total')
          .getRawOne(),

        // Tổng giá trị tồn kho (simplified)
        this.inventoryLedgerRepository
          .createQueryBuilder('il')
          .select('SUM(il.quantity_in - il.quantity_out)', 'total')
          .getRawOne(),
      ]);

    return {
      period: { fromDate, toDate },
      totalSales: Number(totalSales?.total || 0),
      totalDebt: Number(debtSummary?.total || 0),
      totalCash: Number(cashSummary?.total || 0),
      totalInventory: Number(inventorySummary?.total || 0),
    };
  }

  // ==================== BÁO CÁO XUẤT HÀNG (SALES REPORT) ====================

  /**
   * Báo cáo xuất hàng theo cột bơm
   */
  async getSalesByPumpReport(storeId: number, fromDate: Date, toDate: Date) {
    try {
      // Simplified query
      const results = await this.pumpReadingRepository
        .createQueryBuilder('pr')
        .leftJoin('pr.shift', 'shift')
        .leftJoin('pr.product', 'product')
        .select('pr.pump_code', 'pumpCode')
        .addSelect('product.name', 'productName')
        .addSelect('pr.unit_price', 'unitPrice')
        .addSelect('SUM(pr.quantity)', 'totalQuantity')
        .addSelect('SUM(pr.quantity * pr.unit_price)', 'totalAmount')
        .where('shift.store_id = :storeId', { storeId })
        .andWhere('shift.shift_date BETWEEN :fromDate AND :toDate', {
          fromDate,
          toDate,
        })
        .andWhere('shift.status = :status', { status: 'CLOSED' })
        .groupBy('pr.pump_code')
        .addGroupBy('product.name')
        .addGroupBy('pr.unit_price')
        .getRawMany();

      return results;
    } catch (error) {
      console.error('Error in getSalesByPumpReport:', error);
      throw error;
    }
  }

  /**
   * Báo cáo xuất hàng theo mặt hàng
   */
  async getSalesByProductReport(storeId: number, fromDate: Date, toDate: Date) {
    const query = this.pumpReadingRepository
      .createQueryBuilder('pr')
      .leftJoin('pr.shift', 'shift')
      .leftJoin('pr.product', 'product')
      .select('product.id', 'productId')
      .addSelect('product.name', 'productName')
      .addSelect('AVG(pr.unit_price)', 'unitPrice')
      .addSelect('SUM(pr.quantity)', 'totalQuantity')
      .addSelect('SUM(pr.quantity * pr.unit_price)', 'totalAmount')
      .where('shift.store_id = :storeId', { storeId })
      .andWhere('shift.shift_date BETWEEN :fromDate AND :toDate', {
        fromDate,
        toDate,
      })
      .groupBy('product.id')
      .addGroupBy('product.name')
      .orderBy('product.name', 'ASC');

    return query.getRawMany();
  }

  /**
   * Báo cáo xuất hàng chi tiết theo từng ca
   */
  async getSalesByShiftReport(storeId: number, fromDate: Date, toDate: Date) {
    const query = this.pumpReadingRepository
      .createQueryBuilder('pr')
      .leftJoin('pr.shift', 'shift')
      .leftJoin('pr.product', 'product')
      .select('shift.id', 'shiftId')
      .addSelect('shift.shift_no', 'shiftNo')
      .addSelect('shift.shift_date', 'shiftDate')
      .addSelect('shift.opened_at', 'openedAt')
      .addSelect('shift.closed_at', 'closedAt')
      .addSelect('shift.status', 'status')
      .addSelect('product.name', 'productName')
      .addSelect('AVG(pr.unit_price)', 'unitPrice')
      .addSelect('SUM(pr.quantity)', 'totalQuantity')
      .addSelect('SUM(pr.quantity * pr.unit_price)', 'totalAmount')
      .where('shift.store_id = :storeId', { storeId })
      .andWhere('shift.shift_date BETWEEN :fromDate AND :toDate', {
        fromDate,
        toDate,
      })
      .groupBy('shift.id')
      .addGroupBy('shift.shift_no')
      .addGroupBy('shift.shift_date')
      .addGroupBy('shift.opened_at')
      .addGroupBy('shift.closed_at')
      .addGroupBy('shift.status')
      .addGroupBy('product.name')
      .orderBy('shift.shift_date', 'DESC')
      .addOrderBy('shift.shift_no', 'DESC')
      .addOrderBy('product.name', 'ASC');

    return query.getRawMany();
  }

  // ==================== Báo cáo phiếu nhập kho ====================

  /**
   * Báo cáo bảng kê nhập kho (In Bảng Kê Nhập)
   * Tương tự như báo cáo công nợ, nhưng cho phiếu nhập kho
   * @param params - Tham số lọc
   * @returns Danh sách phiếu nhập kho với chi tiết
   */
  async getInventoryImportReport(params: {
    warehouseId?: number;
    storeId?: number;
    fromDate?: Date;
    toDate?: Date;
    docType?: string;
  }) {
    const { warehouseId, storeId, fromDate, toDate, docType } = params;

    // Build query for inventory documents
    const query = this.inventoryDocumentRepository
      .createQueryBuilder('doc')
      .leftJoinAndSelect('doc.warehouse', 'warehouse')
      .leftJoinAndSelect('warehouse.store', 'store')
      .leftJoinAndSelect('doc.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('items.tank', 'tank')
      .orderBy('doc.docDate', 'DESC')
      .addOrderBy('doc.id', 'DESC');

    // Filter by warehouse
    if (warehouseId) {
      query.andWhere('doc.warehouseId = :warehouseId', { warehouseId });
    }

    // Filter by store
    if (storeId) {
      query.andWhere('warehouse.storeId = :storeId', { storeId });
    }

    // Filter by date range
    if (fromDate) {
      query.andWhere('doc.docDate >= :fromDate', { fromDate });
    }
    if (toDate) {
      const nextDay = new Date(toDate);
      nextDay.setDate(nextDay.getDate() + 1);
      query.andWhere('doc.docDate < :toDate', { toDate: nextDay });
    }

    // Filter by document type (IMPORT, EXPORT, TRANSFER_IN, TRANSFER_OUT, ADJUSTMENT)
    if (docType) {
      query.andWhere('doc.docType = :docType', { docType });
    } else {
      // Mặc định chỉ lấy phiếu nhập (IMPORT, TRANSFER_IN)
      query.andWhere('doc.docType IN (:...docTypes)', {
        docTypes: ['IMPORT', 'TRANSFER_IN'],
      });
    }

    const documents = await query.getMany();

    // Format response
    return documents.map((doc) => {
      const totalQuantity = doc.items.reduce(
        (sum, item) => sum + Number(item.quantity),
        0,
      );
      const totalAmount = doc.items.reduce(
        (sum, item) =>
          sum + Number(item.quantity) * Number(item.unitPrice || 0),
        0,
      );

      return {
        id: doc.id,
        docDate: doc.docDate,
        docType: doc.docType,
        status: doc.status,
        supplierName: doc.supplierName,
        invoiceNumber: doc.invoiceNumber,
        licensePlate: doc.licensePlate,
        warehouse: {
          id: doc.warehouse.id,
          type: doc.warehouse.type,
          storeName: doc.warehouse.store?.name || 'N/A',
          storeCode: doc.warehouse.store?.code || 'N/A',
        },
        items: doc.items.map((item) => ({
          id: item.id,
          productId: item.product.id,
          productCode: item.product.code,
          productName: item.product.name,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice || 0),
          amount: Number(item.quantity) * Number(item.unitPrice || 0),
          tankCode: item.tank?.tankCode || null,
          tankName: item.tank?.name || null,
        })),
        totalQuantity,
        totalAmount,
      };
    });
  }

  /**
   * Báo cáo chi tiết một phiếu nhập kho
   * @param documentId - ID phiếu nhập kho
   * @returns Chi tiết phiếu nhập kho
   */
  async getInventoryImportDocumentDetail(documentId: number) {
    const document = await this.inventoryDocumentRepository.findOne({
      where: { id: documentId },
      relations: [
        'warehouse',
        'warehouse.store',
        'items',
        'items.product',
        'items.tank',
      ],
    });

    if (!document) {
      throw new Error('Inventory document not found');
    }

    const totalQuantity = document.items.reduce(
      (sum, item) => sum + Number(item.quantity),
      0,
    );
    const totalAmount = document.items.reduce(
      (sum, item) => sum + Number(item.quantity) * Number(item.unitPrice || 0),
      0,
    );

    return {
      id: document.id,
      docDate: document.docDate,
      docType: document.docType,
      status: document.status,
      supplierName: document.supplierName,
      invoiceNumber: document.invoiceNumber,
      licensePlate: document.licensePlate,
      warehouse: {
        id: document.warehouse.id,
        type: document.warehouse.type,
        storeName: document.warehouse.store?.name || 'N/A',
        storeCode: document.warehouse.store?.code || 'N/A',
      },
      items: document.items.map((item) => ({
        id: item.id,
        productId: item.product.id,
        productCode: item.product.code,
        productName: item.product.name,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice || 0),
        amount: Number(item.quantity) * Number(item.unitPrice || 0),
        tankId: item.tank?.id || null,
        tankCode: item.tank?.tankCode || null,
        tankName: item.tank?.name || null,
      })),
      totalQuantity,
      totalAmount,
    };
  }

  /**
   * Báo cáo tổng hợp nhập kho theo mặt hàng
   * @param params - Tham số lọc
   * @returns Tổng hợp nhập kho theo từng mặt hàng
   */
  async getInventoryImportSummaryByProduct(params: {
    warehouseId?: number;
    storeId?: number;
    fromDate?: Date;
    toDate?: Date;
  }) {
    const { warehouseId, storeId, fromDate, toDate } = params;

    const query = this.inventoryDocumentItemRepository
      .createQueryBuilder('item')
      .leftJoin('item.document', 'doc')
      .leftJoin('doc.warehouse', 'warehouse')
      .leftJoin('item.product', 'product')
      .select('product.id', 'productId')
      .addSelect('product.code', 'productCode')
      .addSelect('product.name', 'productName')
      .addSelect('SUM(item.quantity)', 'totalQuantity')
      .addSelect('SUM(item.quantity * item.unitPrice)', 'totalAmount')
      .addSelect('COUNT(DISTINCT doc.id)', 'documentCount')
      .where('doc.docType IN (:...docTypes)', {
        docTypes: ['IMPORT', 'TRANSFER_IN'],
      })
      .groupBy('product.id')
      .addGroupBy('product.code')
      .addGroupBy('product.name')
      .orderBy('product.code', 'ASC');

    if (warehouseId) {
      query.andWhere('doc.warehouseId = :warehouseId', { warehouseId });
    }

    if (storeId) {
      query.andWhere('warehouse.storeId = :storeId', { storeId });
    }

    if (fromDate) {
      query.andWhere('doc.docDate >= :fromDate', { fromDate });
    }

    if (toDate) {
      const nextDay = new Date(toDate);
      nextDay.setDate(nextDay.getDate() + 1);
      query.andWhere('doc.docDate < :toDate', { toDate: nextDay });
    }

    const results = await query.getRawMany();

    return results.map((r) => ({
      productId: r.productId,
      productCode: r.productCode,
      productName: r.productName,
      totalQuantity: Number(r.totalQuantity || 0),
      totalAmount: Number(r.totalAmount || 0),
      documentCount: Number(r.documentCount || 0),
      averagePrice:
        Number(r.totalQuantity) > 0
          ? Number(r.totalAmount) / Number(r.totalQuantity)
          : 0,
    }));
  }

  /**
   * Báo cáo tổng hợp nhập kho theo nhà cung cấp
   * @param params - Tham số lọc
   * @returns Tổng hợp nhập kho theo từng nhà cung cấp
   */
  async getInventoryImportSummaryBySupplier(params: {
    warehouseId?: number;
    storeId?: number;
    fromDate?: Date;
    toDate?: Date;
  }) {
    const { warehouseId, storeId, fromDate, toDate } = params;

    const query = this.inventoryDocumentRepository
      .createQueryBuilder('doc')
      .leftJoin('doc.warehouse', 'warehouse')
      .leftJoin('doc.items', 'items')
      .select('doc.supplierName', 'supplierName')
      .addSelect('COUNT(DISTINCT doc.id)', 'documentCount')
      .addSelect('SUM(items.quantity * items.unitPrice)', 'totalAmount')
      .where('doc.docType IN (:...docTypes)', {
        docTypes: ['IMPORT', 'TRANSFER_IN'],
      })
      .andWhere('doc.supplierName IS NOT NULL')
      .groupBy('doc.supplierName')
      .orderBy('totalAmount', 'DESC');

    if (warehouseId) {
      query.andWhere('doc.warehouseId = :warehouseId', { warehouseId });
    }

    if (storeId) {
      query.andWhere('warehouse.storeId = :storeId', { storeId });
    }

    if (fromDate) {
      query.andWhere('doc.docDate >= :fromDate', { fromDate });
    }

    if (toDate) {
      const nextDay = new Date(toDate);
      nextDay.setDate(nextDay.getDate() + 1);
      query.andWhere('doc.docDate < :toDate', { toDate: nextDay });
    }

    const results = await query.getRawMany();

    return results.map((r) => ({
      supplierName: r.supplierName || 'N/A',
      documentCount: Number(r.documentCount || 0),
      totalAmount: Number(r.totalAmount || 0),
    }));
  }
}
