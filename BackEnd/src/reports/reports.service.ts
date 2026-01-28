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
import { ReceiptDetail } from '../entities/receipt-detail.entity';
import { CashDeposit } from '../entities/cash-deposit.entity';
import { PumpReading } from '../entities/pump-reading.entity';
import { InventoryDocument } from '../entities/inventory-document.entity';
import { InventoryDocumentItem } from '../entities/inventory-document-item.entity';
import { Product } from '../entities/product.entity';
import { Warehouse } from '../entities/warehouse.entity';
import { ProductPrice } from '../entities/product-price.entity';
import {
  RevenueSalesReportQueryDto,
  RevenueSalesReportResponse,
  StoreDetail,
  ProductDetail,
  PricePeriod,
  SalesByCustomerReportQueryDto,
  SalesByCustomerReportResponse,
  CustomerDetail,
} from './dto/revenue-sales-report.dto';

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
    @InjectRepository(ReceiptDetail)
    private receiptDetailRepository: Repository<ReceiptDetail>,
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
    @InjectRepository(ProductPrice)
    private productPriceRepository: Repository<ProductPrice>,
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
          // ⏰ Dùng ledger_at (thời điểm nghiệp vụ) thay vì created_at
          ledgerQuery.andWhere('dl.ledger_at BETWEEN :fromDate AND :toDate', {
            fromDate,
            toDate,
          });
        }

        const ledgers = await ledgerQuery
          .orderBy('dl.ledger_at', 'ASC')
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
              date: l.ledgerAt || l.createdAt, // ⏰ Ưu tiên ledgerAt
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
   * ⏰ Sử dụng ledger_at (thời điểm nghiệp vụ) thay vì created_at
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
      .andWhere('dl.ledger_at < :toDate', { toDate }); // ⏰ Dùng ledger_at

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
      return sum + Math.round(Number(reading.quantity) * Number(reading.unitPrice || 0)); // Làm tròn để tránh số lẻ thập phân
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
        amount: Math.round(Number(reading.quantity) * Number(reading.unitPrice)), // Làm tròn để tránh phần thập phân
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
      // ⏰ Dùng closed_at (thời điểm chốt ca) để lọc chính xác theo kỳ giá
      // Tránh trường hợp 1 ngày có 2 ca do thay đổi giá
      .where('shift.closed_at >= :fromDate', { fromDate })
      .andWhere('shift.closed_at <= :toDate', { toDate })
      .andWhere('shift.status = :status', { status: 'CLOSED' })
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
      // ⏰ Dùng ledger_at (thời điểm nghiệp vụ) thay vì created_at
      openingBalanceQuery.andWhere('cl.ledger_at < :fromDate', { fromDate });
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
      // ⏰ Dùng ledger_at (thời điểm nghiệp vụ) thay vì created_at
      if (storeId) {
        ledgerQuery.andWhere('cl.ledger_at BETWEEN :fromDate AND :toDate', {
          fromDate,
          toDate,
        });
      } else {
        ledgerQuery.where('cl.ledger_at BETWEEN :fromDate AND :toDate', {
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
              receiptAt: receipt.receiptAt, // Thời gian thu tiền do người dùng chọn
              customers:
                receipt.receiptDetails?.map((rd) => ({
                  customerName: rd.customer?.name || 'N/A',
                  amount: Number(rd.amount),
                })) || [],
              totalAmount: Number(receipt.amount),
              notes: receipt.notes,
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
              depositAt: deposit.depositAt,
              receiverName: deposit.receiverName,
              amount: Number(deposit.amount),
              notes: deposit.notes,
            };
          }
        }

        // Xác định ngày hiển thị: ưu tiên ledgerAt, sau đó receipt/deposit, cuối cùng createdAt
        let displayDate = l.ledgerAt || l.createdAt;
        if (!l.ledgerAt) {
          // Fallback cho dữ liệu cũ chưa có ledgerAt
          if (details?.type === 'RECEIPT' && details.receiptAt) {
            displayDate = details.receiptAt;
          } else if (details?.type === 'DEPOSIT' && details.depositAt) {
            displayDate = details.depositAt;
          }
        }

        return {
          id: l.id,
          shiftId: l.shiftId,
          date: displayDate,
          refType: l.refType,
          refId: l.refId,
          cashIn: Number(l.cashIn),
          cashOut: Number(l.cashOut),
          storeName: l.store?.name || 'N/A',
          details,
          notes: details?.notes || null,
        };
      }),
    );

    // ✅ GỘP SHIFT_CLOSE và DEPOSIT cùng ca thành 1 dòng
    // Nếu trong cùng 1 ca có SHIFT_CLOSE (cashIn) và DEPOSIT (cashOut) với số tiền bằng nhau
    // thì gộp lại thành 1 dòng duy nhất với tồn quỹ = 0
    const mergedLedgers: typeof ledgersWithDetails = [];
    const processedShiftIds = new Set<number>();

    for (let i = 0; i < ledgersWithDetails.length; i++) {
      const ledger = ledgersWithDetails[i];

      // Bỏ qua nếu đã xử lý trong ca khác
      if (ledger.shiftId && processedShiftIds.has(ledger.shiftId)) {
        continue;
      }

      // Nếu là SHIFT_CLOSE, tìm xem có DEPOSIT cùng ca không
      if (ledger.refType === 'SHIFT_CLOSE' && ledger.shiftId) {
        // Tìm tất cả DEPOSIT trong cùng ca
        const depositsInSameShift = ledgersWithDetails.filter(
          (l) => l.shiftId === ledger.shiftId && l.refType === 'DEPOSIT'
        );

        // Tính tổng cashOut từ tất cả DEPOSIT trong ca
        const totalDeposit = depositsInSameShift.reduce((sum, d) => sum + d.cashOut, 0);

        // Nếu tổng nộp = tiền bán lẻ (cashIn), gộp thành 1 dòng với balance = 0
        if (depositsInSameShift.length > 0 && totalDeposit === ledger.cashIn) {
          // Gộp thành 1 dòng: vừa thu vừa nộp, tồn quỹ trừ về 0
          mergedLedgers.push({
            ...ledger,
            refType: 'SHIFT_CLOSE_DEPOSIT', // Loại mới: gộp chốt ca + nộp tiền
            cashOut: totalDeposit,
            notes: `Chốt ca & nộp tiền: ${ledger.cashIn.toLocaleString()}đ`,
            details: {
              type: 'SHIFT_CLOSE_DEPOSIT',
              shiftClose: { cashIn: ledger.cashIn },
              deposits: depositsInSameShift.map((d) => ({
                amount: d.cashOut,
                receiverName: d.details?.receiverName,
                notes: d.details?.notes,
              })),
            },
          });
          processedShiftIds.add(ledger.shiftId);
          continue;
        }
      }

      // Nếu là DEPOSIT và đã được gộp với SHIFT_CLOSE, bỏ qua
      if (ledger.refType === 'DEPOSIT' && ledger.shiftId && processedShiftIds.has(ledger.shiftId)) {
        continue;
      }

      // Các trường hợp khác: giữ nguyên
      mergedLedgers.push(ledger);
    }

    // Tính toán số dư luỹ kế
    let runningBalance = openingBalance;
    const ledgersWithBalance = mergedLedgers.map((l) => {
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
        // Tổng doanh thu - ⏰ Dùng closed_at thay vì shift_date
        this.saleRepository
          .createQueryBuilder('s')
          .leftJoin('s.shift', 'shift')
          .select('SUM(s.amount)', 'total')
          .where('shift.closed_at >= :fromDate', { fromDate })
          .andWhere('shift.closed_at <= :toDate', { toDate })
          .andWhere('shift.status = :status', { status: 'CLOSED' })
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
        docAt: doc.docAt,
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
          amount: Math.round(Number(item.quantity) * Number(item.unitPrice || 0)), // Làm tròn để tránh phần thập phân
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
        amount: Math.round(Number(item.quantity) * Number(item.unitPrice || 0)), // Làm tròn để tránh phần thập phân
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
      .addSelect('SUM(ROUND(item.quantity * item.unitPrice))', 'totalAmount')
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
      .addSelect('SUM(ROUND(items.quantity * items.unitPrice))', 'totalAmount')
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

  // ==================== BÁO CÁO DOANH THU / XUẤT HÀNG ====================

  /**
   * Báo cáo doanh thu / xuất hàng
   * Kết hợp:
   * - Bán công nợ (từ bảng sales với customerId)
   * - Bán lẻ (từ bảng sales không có customerId - tính theo shift)
   * Filter theo:
   * - Mặt hàng (productId)
   * - Kỳ giá (validFrom -> validTo từ product_prices)
   * - Khách hàng (customerId) - chỉ áp dụng cho bán công nợ
   * - Cửa hàng (storeId)
   * - Loại bán (saleType: all/debt/retail)
   */
  /**
   * Lấy danh sách kỳ giá để hiển thị trong dropdown filter
   * Chỉ trả về các khoảng thời gian duy nhất (không lặp theo mặt hàng)
   * Vì tất cả mặt hàng cùng đổi giá cùng 1 thời điểm
   * @returns Danh sách kỳ giá với label đã format
   */
  async getPricePeriods(): Promise<PricePeriod[]> {
    // Lấy các khoảng thời gian duy nhất bằng GROUP BY
    // Sử dụng GROUP BY thay vì DISTINCT để xử lý đúng với NULL values trong PostgreSQL
    const prices = await this.productPriceRepository
      .createQueryBuilder('price')
      .select('price.validFrom', 'validFrom')
      .addSelect('price.validTo', 'validTo')
      .groupBy('price.validFrom')
      .addGroupBy('price.validTo')
      .orderBy('price.validFrom', 'DESC')
      .getRawMany();

    return prices.map((row, index) => {
      const validFromStr = row.validFrom
        ? new Date(row.validFrom).toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : '';
      const validToStr = row.validTo
        ? new Date(row.validTo).toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : 'Hiện tại';

      return {
        priceId: index + 1, // Dùng index vì không có id duy nhất
        productId: 0, // Không cần productId vì kỳ giá áp dụng cho tất cả mặt hàng
        productCode: '',
        productName: '',
        validFrom: row.validFrom,
        validTo: row.validTo,
        price: 0, // Không cần giá cụ thể
        label: `${validFromStr} → ${validToStr}`,
      };
    });
  }

  /**
   * Báo cáo doanh thu/xuất hàng
   * - Nhóm theo Cửa hàng -> Mặt hàng
   * - Filter: Thời gian (datetime), Cửa hàng, Mặt hàng
   * - Kỳ giá: Frontend chọn từ dropdown và tự set fromDateTime/toDateTime
   *
   * UPDATED: Tính toán 3 loại số liệu:
   * - Tổng xuất bán (tất cả sales)
   * - Bán công nợ (có customerId)
   * - Bán lẻ = Tổng - Công nợ
   */
  async getRevenueSalesReport(
    query: RevenueSalesReportQueryDto,
  ): Promise<RevenueSalesReportResponse> {
    const { productId, storeId, fromDateTime, toDateTime } = query;

    // ========== QUERY 1: TỔNG XUẤT BÁN từ PUMP_READINGS (lượng bơm qua vòi) ==========
    // Đây là tổng thực sự = Bán lẻ + Bán công nợ
    const pumpReadingsQuery = this.pumpReadingRepository
      .createQueryBuilder('pr')
      .leftJoin('pr.shift', 'shift')
      .leftJoin('shift.store', 'store')
      .leftJoin('pr.product', 'product')
      .where('shift.status IN (:...statuses)', { statuses: ['CLOSED', 'ADJUSTED'] })
      .select([
        'shift.storeId AS "storeId"',
        'store.code AS "storeCode"',
        'store.name AS "storeName"',
        'pr.productId AS "productId"',
        'product.code AS "productCode"',
        'product.name AS "productName"',
        'SUM(pr.quantity) AS "totalQuantity"',
        'SUM(ROUND(pr.quantity * pr.unitPrice)) AS "totalAmount"',
      ])
      .groupBy('shift.storeId')
      .addGroupBy('store.code')
      .addGroupBy('store.name')
      .addGroupBy('pr.productId')
      .addGroupBy('product.code')
      .addGroupBy('product.name');

    // Filter theo productId
    if (productId) {
      pumpReadingsQuery.andWhere('pr.productId = :productId', { productId });
    }

    // Filter theo storeId
    if (storeId) {
      pumpReadingsQuery.andWhere('shift.storeId = :storeId', { storeId });
    }

    // Filter theo thời gian - Dùng closedAt thay vì openedAt để tính đúng doanh thu theo thời điểm đóng ca
    if (fromDateTime) {
      pumpReadingsQuery.andWhere('shift.closedAt >= :fromDateTime', {
        fromDateTime: new Date(fromDateTime),
      });
    }
    if (toDateTime) {
      pumpReadingsQuery.andWhere('shift.closedAt <= :toDateTime', {
        toDateTime: new Date(toDateTime),
      });
    }

    // ========== QUERY 2: BÁN CÔNG NỢ từ SHIFT_DEBT_SALES ==========
    const debtSalesQuery = this.shiftDebtSaleRepository
      .createQueryBuilder('sds')
      .leftJoin('sds.shift', 'shift')
      .leftJoin('shift.store', 'store')
      .where('shift.status IN (:...statuses)', { statuses: ['CLOSED', 'ADJUSTED'] })
      .select([
        'shift.storeId AS "storeId"',
        'sds.productId AS "productId"',
        'SUM(sds.quantity) AS "debtQuantity"',
        'SUM(sds.amount) AS "debtAmount"',
      ])
      .groupBy('shift.storeId')
      .addGroupBy('sds.productId');

    // Apply same filters
    if (productId) {
      debtSalesQuery.andWhere('sds.productId = :productId', { productId });
    }
    if (storeId) {
      debtSalesQuery.andWhere('shift.storeId = :storeId', { storeId });
    }
    // Filter theo thời gian - Dùng closedAt thay vì openedAt để tính đúng doanh thu theo thời điểm đóng ca
    if (fromDateTime) {
      debtSalesQuery.andWhere('shift.closedAt >= :fromDateTime', {
        fromDateTime: new Date(fromDateTime),
      });
    }
    if (toDateTime) {
      debtSalesQuery.andWhere('shift.closedAt <= :toDateTime', {
        toDateTime: new Date(toDateTime),
      });
    }

    // Execute both queries
    const [totalResults, debtResults] = await Promise.all([
      pumpReadingsQuery.getRawMany(),
      debtSalesQuery.getRawMany(),
    ]);

    // Create a map for debt data lookup: storeId-productId -> {debtQuantity, debtAmount}
    const debtMap = new Map<string, { debtQuantity: number; debtAmount: number }>();
    for (const row of debtResults) {
      const key = `${row.storeId}-${row.productId}`;
      debtMap.set(key, {
        debtQuantity: Number(row.debtQuantity) || 0,
        debtAmount: Number(row.debtAmount) || 0,
      });
    }

    // ========== GROUP DỮ LIỆU: Cửa hàng -> Mặt hàng ==========
    const storesMap = new Map<number, StoreDetail>();

    for (const row of totalResults) {
      // Get or create store
      if (!storesMap.has(row.storeId)) {
        storesMap.set(row.storeId, {
          storeId: row.storeId,
          storeCode: row.storeCode || '',
          storeName: row.storeName || '',
          totalQuantity: 0,
          totalAmount: 0,
          debtQuantity: 0,
          debtAmount: 0,
          retailQuantity: 0,
          retailAmount: 0,
          products: [],
        });
      }
      const store = storesMap.get(row.storeId)!;

      // Get debt data for this store-product
      const key = `${row.storeId}-${row.productId}`;
      const debt = debtMap.get(key) || { debtQuantity: 0, debtAmount: 0 };

      // Calculate quantities
      // Tổng bán = từ pump readings
      const totalQty = Number(row.totalQuantity) || 0;
      const totalAmt = Number(row.totalAmount) || 0;
      // Công nợ = từ shift_debt_sales
      const debtQty = debt.debtQuantity;
      const debtAmt = debt.debtAmount;
      // Bán lẻ = Tổng bán - Công nợ
      const retailQty = totalQty - debtQty;
      const retailAmt = totalAmt - debtAmt;

      // Add product
      store.products.push({
        productId: row.productId,
        productCode: row.productCode || '',
        productName: row.productName || '',
        totalQuantity: totalQty,
        totalAmount: totalAmt,
        debtQuantity: debtQty,
        debtAmount: debtAmt,
        retailQuantity: retailQty,
        retailAmount: retailAmt,
      });

      // Accumulate store totals
      store.totalQuantity += totalQty;
      store.totalAmount += totalAmt;
      store.debtQuantity += debtQty;
      store.debtAmount += debtAmt;
      store.retailQuantity += retailQty;
      store.retailAmount += retailAmt;
    }

    // Convert map to array and sort
    const stores: StoreDetail[] = Array.from(storesMap.values());
    stores.sort((a, b) =>
      (a.storeCode || '').localeCompare(b.storeCode || ''),
    );
    stores.forEach((store) => {
      store.products.sort((a, b) =>
        (a.productCode || '').localeCompare(b.productCode || ''),
      );
    });

    // Tính tổng
    const summary = {
      totalQuantity: stores.reduce((sum, s) => sum + s.totalQuantity, 0),
      totalAmount: stores.reduce((sum, s) => sum + s.totalAmount, 0),
      debtQuantity: stores.reduce((sum, s) => sum + s.debtQuantity, 0),
      debtAmount: stores.reduce((sum, s) => sum + s.debtAmount, 0),
      retailQuantity: stores.reduce((sum, s) => sum + s.retailQuantity, 0),
      retailAmount: stores.reduce((sum, s) => sum + s.retailAmount, 0),
    };

    return {
      stores,
      summary,
    };
  }

  // ==================== BÁO CÁO THEO KHÁCH HÀNG ====================

  /**
   * Báo cáo doanh thu theo khách hàng
   * - Nhóm theo Khách hàng -> Mặt hàng
   * - Chỉ lấy các record có customerId (bán công nợ)
   */
  async getSalesByCustomerReport(
    query: SalesByCustomerReportQueryDto,
  ): Promise<SalesByCustomerReportResponse> {
    const { customerId, storeId, productId, fromDateTime, toDateTime } = query;

    // Query sales có customerId (bán công nợ)
    const salesQuery = this.saleRepository
      .createQueryBuilder('sale')
      .leftJoin('sale.product', 'product')
      .leftJoin('sale.customer', 'customer')
      .leftJoin('sale.shift', 'shift')
      .where('sale.customerId IS NOT NULL')
      .select([
        'sale.customerId AS "customerId"',
        'customer.code AS "customerCode"',
        'customer.name AS "customerName"',
        'sale.productId AS "productId"',
        'product.code AS "productCode"',
        'product.name AS "productName"',
        'SUM(sale.quantity) AS "quantity"',
        'SUM(sale.amount) AS "amount"',
      ])
      .groupBy('sale.customerId')
      .addGroupBy('customer.code')
      .addGroupBy('customer.name')
      .addGroupBy('sale.productId')
      .addGroupBy('product.code')
      .addGroupBy('product.name');

    // Filter theo customerId
    if (customerId) {
      salesQuery.andWhere('sale.customerId = :customerId', { customerId });
    }

    // Filter theo storeId
    if (storeId) {
      salesQuery.andWhere('sale.storeId = :storeId', { storeId });
    }

    // Filter theo productId
    if (productId) {
      salesQuery.andWhere('sale.productId = :productId', { productId });
    }

    // 🔥 Filter theo shift.openedAt để gán doanh thu về ngày mở ca (đúng ngày làm việc)
    // Ví dụ: Ca mở 23h ngày 23, đóng 7h ngày 24 → doanh thu thuộc ngày 23
    if (fromDateTime) {
      // Nếu chưa có timestamp (YYYY-MM-DD), thêm vào. Nếu đã có (ISO string) thì giữ nguyên
      const fromDateStr = fromDateTime.includes('T') ? fromDateTime : fromDateTime + 'T00:00:00';
      salesQuery.andWhere('shift.openedAt >= :fromDateTime', {
        fromDateTime: new Date(fromDateStr),
      });
    }
    if (toDateTime) {
      const toDateStr = toDateTime.includes('T') ? toDateTime : toDateTime + 'T23:59:59.999';
      salesQuery.andWhere('shift.openedAt <= :toDateTime', {
        toDateTime: new Date(toDateStr),
      });
    }

    const salesResults = await salesQuery.getRawMany();

    // ========== GROUP DỮ LIỆU: Khách hàng -> Mặt hàng ==========
    const customersMap = new Map<number, CustomerDetail>();

    for (const row of salesResults) {
      // Get or create customer
      if (!customersMap.has(row.customerId)) {
        customersMap.set(row.customerId, {
          customerId: row.customerId,
          customerCode: row.customerCode || '',
          customerName: row.customerName || '',
          totalQuantity: 0,
          totalAmount: 0,
          products: [],
        });
      }
      const customer = customersMap.get(row.customerId)!;

      // Add product (đã SUM sẵn từ query)
      const qty = Number(row.quantity) || 0;
      const amt = Number(row.amount) || 0;

      customer.products.push({
        productId: row.productId,
        productCode: row.productCode || '',
        productName: row.productName || '',
        quantity: qty,
        amount: amt,
      });

      customer.totalQuantity += qty;
      customer.totalAmount += amt;
    }

    // Convert map to array and sort
    const customers: CustomerDetail[] = Array.from(customersMap.values());
    customers.sort((a, b) =>
      (a.customerCode || '').localeCompare(b.customerCode || ''),
    );
    customers.forEach((customer) => {
      customer.products.sort((a, b) =>
        (a.productCode || '').localeCompare(b.productCode || ''),
      );
    });

    // Tính tổng
    const summary = {
      totalQuantity: customers.reduce((sum, c) => sum + c.totalQuantity, 0),
      totalAmount: customers.reduce((sum, c) => sum + c.totalAmount, 0),
    };

    return {
      customers,
      summary,
    };
  }

  /**
   * Báo cáo ca - Tổng hợp doanh thu theo pump readings
   * Dùng cho màn hình "Báo cáo ca"
   */
  async getSalesByShiftReport(
    storeId?: number,
    fromDate?: Date,
    toDate?: Date,
  ) {
    if (!storeId) {
      return [];
    }

    const query = this.pumpReadingRepository
      .createQueryBuilder('pr')
      .leftJoin('pr.shift', 'shift')
      .leftJoin('pr.product', 'product')
      .leftJoin('pr.pump', 'pump') // Sử dụng relation pump_id thay vì pump_code để join chính xác hơn
      .select('shift.id', 'shiftId')
      .addSelect('shift.shift_no', 'shiftNo')
      .addSelect('shift.shift_date', 'shiftDate')
      .addSelect('pump.id', 'pumpId')
      .addSelect('COALESCE(pump.pump_code, pr.pump_code)', 'pumpCode') // Fallback về pr.pump_code nếu pump_id chưa được set
      .addSelect('pump.name', 'pumpName')
      .addSelect('product.id', 'productId')
      .addSelect('product.code', 'productCode')
      .addSelect('product.name', 'productName')
      .addSelect('COALESCE(pr.start_value, 0)', 'startValue')
      .addSelect('COALESCE(pr.end_value, 0)', 'endValue')
      .addSelect('COALESCE(pr.test_export, 0)', 'testExport')
      .addSelect('COALESCE(pr.quantity, 0)', 'quantity')
      .addSelect('COALESCE(pr.unit_price, 0)', 'unitPrice')
      .addSelect('COALESCE(ROUND(pr.quantity * pr.unit_price), 0)', 'amount')
      .where('shift.store_id = :storeId', { storeId })
      .andWhere('shift.status IN (:...statuses)', { statuses: ['CLOSED', 'ADJUSTED'] }); // Bao gồm cả ca điều chỉnh

    if (fromDate) {
      query.andWhere('shift.shift_date >= :fromDate', { fromDate });
    }
    if (toDate) {
      query.andWhere('shift.shift_date <= :toDate', { toDate });
    }

    query
      .orderBy('shift.shift_date', 'ASC')
      .addOrderBy('shift.shift_no', 'ASC')
      .addOrderBy('pump.pump_code', 'ASC');

    return query.getRawMany();
  }
}
