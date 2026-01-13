import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { Shift } from '../entities/shift.entity';
import { PumpReading } from '../entities/pump-reading.entity';
import { Sale } from '../entities/sale.entity';
import { InventoryLedger } from '../entities/inventory-ledger.entity';
import { InventoryDocument } from '../entities/inventory-document.entity';
import { InventoryDocumentItem } from '../entities/inventory-document-item.entity';
import { ProductPrice } from '../entities/product-price.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { ShiftDebtSale } from '../entities/shift-debt-sale.entity';
import { CashDeposit } from '../entities/cash-deposit.entity';
import { DebtLedger } from '../entities/debt-ledger.entity';
import { CashLedger } from '../entities/cash-ledger.entity';
import { Receipt } from '../entities/receipt.entity';
import { ReceiptDetail } from '../entities/receipt-detail.entity';
import { Expense } from '../entities/expense.entity';
import { Warehouse } from '../entities/warehouse.entity';
import { Customer } from '../entities/customer.entity';
import { InventoryTruckCompartment } from '../entities/inventory-truck-compartment.entity';
import { InventoryLossCalculation } from '../entities/inventory-loss-calculation.entity';
import { CreateShiftDto } from './dto/create-shift.dto';
import { CloseShiftDto } from './dto/close-shift.dto';
import {
  CreateShiftDebtSaleDto,
  CreateCashDepositDto,
  CreateReceiptDto,
} from './dto/shift-operations.dto';
import { In, Brackets } from 'typeorm';
import { CustomersService } from '../customers/customers.service';

@Injectable()
export class ShiftsService {
  constructor(
    @InjectRepository(Shift)
    private shiftRepository: Repository<Shift>,
    @InjectRepository(PumpReading)
    private pumpReadingRepository: Repository<PumpReading>,
    @InjectRepository(Sale)
    private saleRepository: Repository<Sale>,
    @InjectRepository(InventoryLedger)
    private inventoryLedgerRepository: Repository<InventoryLedger>,
    @InjectRepository(ProductPrice)
    private productPriceRepository: Repository<ProductPrice>,
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
    @InjectRepository(ShiftDebtSale)
    private shiftDebtSaleRepository: Repository<ShiftDebtSale>,
    @InjectRepository(CashDeposit)
    private cashDepositRepository: Repository<CashDeposit>,
    @InjectRepository(DebtLedger)
    private debtLedgerRepository: Repository<DebtLedger>,
    @InjectRepository(CashLedger)
    private cashLedgerRepository: Repository<CashLedger>,
    @InjectRepository(Receipt)
    private receiptRepository: Repository<Receipt>,
    @InjectRepository(ReceiptDetail)
    private receiptDetailRepository: Repository<ReceiptDetail>,
    @InjectRepository(Expense)
    private expenseRepository: Repository<Expense>,
    @InjectRepository(Warehouse)
    private warehouseRepository: Repository<Warehouse>,
    private dataSource: DataSource,
    private customersService: CustomersService,
  ) {}

  async create(createShiftDto: CreateShiftDto): Promise<Shift> {
    // 1. Kiểm tra ca trước của cửa hàng này đã đóng chưa
    const previousOpenShift = await this.shiftRepository.findOne({
      where: {
        storeId: createShiftDto.storeId,
        status: 'OPEN',
      },
      order: {
        shiftDate: 'DESC',
        shiftNo: 'DESC',
      },
    });

    if (previousOpenShift) {
      throw new BadRequestException(
        `Không thể mở ca mới. Ca ${previousOpenShift.shiftNo} ngày ${new Date(previousOpenShift.shiftDate).toLocaleDateString('vi-VN')} vẫn đang mở. ` +
          `Vui lòng chốt ca trước đó trước khi mở ca mới.`,
      );
    }

    // 2. Kiểm tra ca này đã tồn tại chưa
    const existingShift = await this.shiftRepository.findOne({
      where: {
        storeId: createShiftDto.storeId,
        shiftDate: new Date(createShiftDto.shiftDate),
        shiftNo: createShiftDto.shiftNo,
      },
    });

    if (existingShift) {
      throw new BadRequestException(
        `Ca ${createShiftDto.shiftNo} ngày ${createShiftDto.shiftDate} đã tồn tại. ` +
          `Vui lòng chọn số ca khác hoặc vào ca đã có để chốt ca.`,
      );
    }

    const { openedAt, ...shiftData } = createShiftDto;

    const shift = this.shiftRepository.create({
      ...shiftData,
      openedAt: openedAt ? new Date(openedAt) : new Date(),
      status: 'OPEN',
    });

    return this.shiftRepository.save(shift);
  }

  async update(
    id: number,
    updateDto: CloseShiftDto,
    user: any,
  ): Promise<Shift> {
    return await this.dataSource.transaction(async (manager) => {
      console.log(`🚀 Bắt đầu Update lại Shift ID: ${id}`);

      const _shift = await manager.findOne(Shift, {
        where: { id },
        relations: ['store', 'store.region'],
      });
      if (!_shift) throw new NotFoundException('Shift not found');

      // Reset status để chuẩn bị cho việc đóng lại
      _shift.status = 'OPEN';

      // ==========================================
      // 1. GATHER IDs (Lấy ID các bảng con)
      // ==========================================
      // Lấy ID Receipt
      const receipts = await manager.find(Receipt, {
        where: { shiftId: id },
        select: ['id'],
      });
      const receiptIds = receipts.map((r) => r.id);

      // Lấy ID InventoryDocument (Cực kỳ quan trọng vì nó hay dính Ledger)
      // Lấy tất cả inventory documents liên quan đến shift này qua refShiftId
      const linkedDocs = await manager.find(InventoryDocument, {
        where: { refShiftId: id },
        select: ['id'],
      });
      const docIds = linkedDocs.map((d) => d.id);

      // ==========================================
      // 2. DELETE LEAF NODES (Xóa dữ liệu phụ thuộc/con trước)
      // ==========================================
      try {
        // 2.1. Xóa INVENTORY LEDGER (Thủ phạm số 1 gây rollback)
        // Ledger kho thường tham chiếu đến Document, không phải Shift
        if (docIds.length > 0) {
          console.log('🗑️ Deleting Inventory Ledgers, Items, Truck Compartments & Loss Calculations...');

          // Xóa truck compartments (cho phiếu nhập xe téc)
          await manager.delete(InventoryTruckCompartment, {
            documentId: In(docIds),
          });

          // Xóa loss calculations (cho phiếu nhập xe téc)
          await manager.delete(InventoryLossCalculation, {
            documentId: In(docIds),
          });

          // Xóa inventory ledger (cho cả IMPORT và EXPORT)
          await manager.delete(InventoryLedger, {
            refId: In(docIds),
          });

          // Xóa inventory document items
          await manager.delete(InventoryDocumentItem, {
            documentId: In(docIds),
          });
        }

        // 2.2. Xóa CASH/DEBT LEDGER
        console.log('🗑️ Deleting Cash/Debt Ledgers...');
        // Xóa các ledger liên quan trực tiếp đến Close Shift (Bán lẻ)
        await manager.delete(CashLedger, {
          shiftId: id,
        });
        await manager.delete(DebtLedger, { shiftId: id }); // Hoặc theo refId của ShiftDebtSale

        // Xóa ledger liên quan đến Receipt/Deposit/Expense
        // (Lưu ý: TypeORM delete hỗ trợ In([]) nên không cần check length > 0, nhưng check cho tối ưu)
        if (receiptIds.length > 0) {
          await manager.delete(ReceiptDetail, { receiptId: In(receiptIds) });
          await manager.delete(CashLedger, {
            refType: 'RECEIPT',
            refId: In(receiptIds),
          });
          await manager.delete(DebtLedger, {
            refType: 'RECEIPT',
            refId: In(receiptIds),
          });
        }
        // Xóa thêm CashLedger của Deposit và Expense nếu cần (tương tự như trên)...
      } catch (error) {
        console.error('❌ Lỗi khi xóa LEAF NODES:', error.message);
        throw new BadRequestException(`Lỗi xóa dữ liệu phụ: ${error.message}`);
      }

      // ==========================================
      // 3. DELETE CORE NODES (Xóa các bảng chính)
      // ==========================================
      try {
        console.log('🗑️ Deleting Core Tables...');

        // Xóa Sale trước (đề phòng Sale có link ngược lại PumpReading - dù hiếm)
        await manager.delete(Sale, { shiftId: id });

        // Xóa ShiftDebtSale
        await manager.delete(ShiftDebtSale, { shiftId: id });

        // Xóa Receipt
        if (receiptIds.length > 0) {
          await manager.delete(Receipt, { shiftId: id });
        }

        // Xóa Inventory Document (Thủ phạm số 2)
        if (docIds.length > 0) {
          await manager.delete(InventoryDocument, { id: In(docIds) });
        }

        // Xóa Deposit & Expense
        await manager.delete(CashDeposit, { shiftId: id });
        await manager.delete(Expense, { shiftId: id });

        // CUỐI CÙNG: Xóa PumpReading
        console.log('🗑️ Deleting PumpReading...');
        const pumpRes = await manager.delete(PumpReading, { shiftId: id });
        console.log(`✅ PumpReading deleted count: ${pumpRes.affected}`);
      } catch (error) {
        console.error('❌ Lỗi khi xóa CORE NODES:', error.message);
        // Đây là chỗ giúp bạn biết bảng nào đang chặn PumpReading bị xóa
        throw new BadRequestException(
          `Lỗi xóa dữ liệu chính: ${error.message}`,
        );
      }

      // ==========================================
      // 4. RE-CREATE (Tạo lại)
      // ==========================================
      console.log('🔄 Re-calculating Close Shift...');
      const shift = await this.closeShiftProcess(
        manager,
        updateDto,
        user,
        _shift,
      );
      return shift;
    });
  }
  async closeShiftProcess(
    manager: EntityManager,
    closeShiftDto: CloseShiftDto,
    user: any,
    _shift?: Shift,
  ): Promise<Shift> {
    const shift =
      _shift ||
      (await manager.findOne(Shift, {
        where: { id: closeShiftDto.shiftId },
        relations: ['store', 'store.region'],
      })) ||
      undefined;

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    if (shift.status !== 'OPEN') {
      throw new BadRequestException('Shift is already closed');
    }

    // Kiểm tra đã có pump readings chưa (tránh duplicate)
    const existingReadings = await manager.count(PumpReading, {
      where: { shiftId: shift.id },
    });
    if (existingReadings > 0) {
      throw new BadRequestException(
        'Shift already has pump readings. Cannot close again.',
      );
    }

    // Lưu trạng thái cũ để ghi audit log
    const oldData = { ...shift };

    // 1. Lưu số liệu cột bơm (bulk insert với unitPrice để lưu vết giá)
    // Lấy giá trước để dùng cho cả pump_readings và sales
    const productIds = [
      ...new Set(closeShiftDto.pumpReadings.map((r) => r.productId)),
    ];
    const prices = await manager.find(ProductPrice, {
      where: productIds.map((productId) => ({
        productId,
        regionId: shift.store.regionId,
      })),
    });

    const priceMap = new Map<number, number>();
    for (const price of prices) {
      if (
        price.validFrom <= new Date() &&
        (!price.validTo || price.validTo > new Date())
      ) {
        priceMap.set(price.productId, Number(price.price));
      }
    }

    // Validate: Tất cả sản phẩm phải có giá
    const missingPrices = closeShiftDto.pumpReadings.filter(
      (r) => !priceMap.has(r.productId),
    );
    if (missingPrices.length > 0) {
      const productIdsStr = [
        ...new Set(missingPrices.map((r) => r.productId)),
      ].join(', ');
      throw new BadRequestException(
        `Không tìm thấy giá cho sản phẩm: ${productIdsStr}. Vui lòng cập nhật bảng giá.`,
      );
    }

    const pumpReadingsData = closeShiftDto.pumpReadings.map((reading) => {
      const grossQuantity = reading.endValue - reading.startValue; // Tổng lượng bơm
      const testExport = reading.testExport || 0; // Xuất kiểm thử/quay kho
      const quantity = grossQuantity - testExport; // Số lượng BÁN thực tế
      const unitPrice = priceMap.get(reading.productId)!;
      return {
        shiftId: shift.id,
        pumpCode: reading.pumpCode,
        productId: reading.productId,
        startValue: reading.startValue,
        endValue: reading.endValue,
        quantity, // Số lượng BÁN (không bao gồm testExport)
        unitPrice, // Lưu giá tại thời điểm chốt ca để đảm bảo tính toàn vẹn dữ liệu kế toán
        testExport, // Xuất kiểm thử / Quay kho (lưu riêng)
      };
    });

    await manager
      .createQueryBuilder()
      .insert()
      .into(PumpReading)
      .values(pumpReadingsData)
      .execute();

    // 2. ✅ Tạo sales từ pump readings - ĐÂY LÀ BÁN LẺ (customerId = null)
    // Bán lẻ = Thu tiền mặt ngay, KHÔNG ghi công nợ
    const salesData = pumpReadingsData.map((reading) => {
      const unitPrice = priceMap.get(reading.productId)!; // Safe after validation
      return {
        shiftId: shift.id,
        storeId: shift.storeId,
        productId: reading.productId,
        quantity: reading.quantity,
        unitPrice,
        amount: reading.quantity * unitPrice,
        customerId: undefined, // ✅ NULL = Bán lẻ (không phải công nợ)
      };
    });

    if (salesData.length > 0) {
      await manager
        .createQueryBuilder()
        .insert()
        .into(Sale)
        .values(salesData)
        .execute();
    }

    // 4. ✅ LẤY WAREHOUSE cho việc tạo phiếu xuất tự động sau này
    const warehouse = await manager.findOne(Warehouse, {
      where: { storeId: shift.storeId, type: 'STORE' },
    });

    if (!warehouse) {
      throw new BadRequestException(
        `Không tìm thấy kho cho cửa hàng ${shift.storeId}`,
      );
    }

    // LƯU Ý: KHÔNG ghi inventory_ledger ở đây vì sẽ được xử lý tự động
    // qua phiếu xuất bán (EXPORT document) ở bước 6.7 phía dưới
    // → Tránh trùng lặp ghi ledger 2 lần cho cùng 1 lượng bán

    // 5. ✅ GHI SỔ QUỸ: Thu tiền bán lẻ (QUAN TRỌNG!)
    // Bán lẻ = Thu tiền mặt ngay → Ghi cashIn vào cash_ledger
    // KHÔNG ghi debt_ledger vì không phải công nợ
    // NOTE: Logic hiện tại giả định TOÀN BỘ bán lẻ là tiền mặt
    // Trong thực tế, cần phân biệt: tiền mặt / thẻ / ví điện tử
    // TODO: Thêm payment_method cho mỗi sale hoặc thêm field cash_amount vào CloseShiftDto

    // ✅ FIX: Tính tổng tiền bán công nợ để TRỪ RA khỏi tổng từ vòi bơm
    // Vì tiền công nợ CHƯA THU, không được ghi vào sổ quỹ
    const totalDebtSalesAmount = (closeShiftDto.debtSales || []).reduce(
      (sum, ds) => sum + ds.quantity * ds.unitPrice,
      0,
    );

    // Tổng tiền từ vòi bơm (bao gồm cả bán lẻ và bán nợ)
    const totalFromPumps = salesData.reduce(
      (sum, s) => sum + Number(s.amount),
      0,
    );

    // Tiền bán lẻ THỰC THU = Tổng từ vòi bơm - Bán công nợ
    const totalRetailAmount = totalFromPumps - totalDebtSalesAmount;

    if (totalRetailAmount > 0) {
      await manager.save(CashLedger, {
        shiftId: shift.id,
        storeId: shift.storeId,
        refType: 'SHIFT_CLOSE',
        refId: shift.id,
        cashIn: totalRetailAmount, // ✅ Thu tiền vào quỹ (CHỈ TIỀN MẶT, KHÔNG BAO GỒM NỢ)
        cashOut: 0,
        notes: `Thu tiền bán lẻ: ${totalFromPumps.toLocaleString()} - công nợ ${totalDebtSalesAmount.toLocaleString()} = ${totalRetailAmount.toLocaleString()}`,
      });
    }

    // 6. Xử lý DRAFT DATA: Debt Sales, Receipts, Deposits
    // 6.1. ✅ Xử lý Debt Sales (bán công nợ - KHÁC VỚI BÁN LẺ!)
    // Frontend chỉ gửi debt sales cho khách hàng thực sự mua nợ
    // KHÔNG bao gồm bán lẻ (đã xử lý ở bước 5)

    // ✅ VALIDATION: Kiểm tra hạn mức công nợ TRƯỚC KHI lưu
    if (closeShiftDto.debtSales && closeShiftDto.debtSales.length > 0) {
      const validationErrors: string[] = [];

      // Group debt sales by customer để tính tổng nợ mới cho mỗi khách
      const debtByCustomer = new Map<number, number>();
      for (const debtSale of closeShiftDto.debtSales) {
        const totalAmount = debtSale.quantity * debtSale.unitPrice;
        const currentTotal = debtByCustomer.get(debtSale.customerId) || 0;
        debtByCustomer.set(debtSale.customerId, currentTotal + totalAmount);
      }

      // Validate từng khách hàng
      for (const [customerId, newDebtAmount] of debtByCustomer) {
        try {
          const validation = await this.customersService.validateDebtLimit(
            customerId,
            shift.storeId,
            newDebtAmount,
          );

          if (!validation.isValid) {
            // Lấy tên khách hàng để hiển thị lỗi rõ ràng hơn
            const customer = await manager.findOne(Customer, {
              where: { id: customerId },
              select: ['id', 'name', 'code'],
            });

            validationErrors.push(
              `❌ Khách hàng "${customer?.name || customerId}" (${customer?.code || ''}): ` +
              `Vượt hạn mức ${validation.exceedAmount.toLocaleString('vi-VN')}đ. ` +
              `Hạn mức: ${validation.creditLimit.toLocaleString('vi-VN')}đ, ` +
              `Nợ hiện tại: ${validation.currentDebt.toLocaleString('vi-VN')}đ, ` +
              `Nợ mới: ${newDebtAmount.toLocaleString('vi-VN')}đ, ` +
              `Tổng nợ: ${validation.totalDebt.toLocaleString('vi-VN')}đ`
            );
          }
        } catch (error) {
          validationErrors.push(
            `❌ Lỗi kiểm tra hạn mức cho khách hàng ${customerId}: ${error.message}`
          );
        }
      }

      // Nếu có lỗi validation, throw error và dừng chốt ca
      if (validationErrors.length > 0) {
        throw new BadRequestException(
          `KHÔNG THỂ CHỐT CA - Vượt hạn mức công nợ:\n\n${validationErrors.join('\n\n')}\n\n` +
          `Vui lòng:\n` +
          `1. Giảm số lượng bán nợ cho khách hàng vượt hạn mức\n` +
          `2. Thu tiền trước khi bán thêm\n` +
          `3. Hoặc liên hệ Admin để tăng hạn mức`
        );
      }
    }

    if (closeShiftDto.debtSales && closeShiftDto.debtSales.length > 0) {
      for (const debtSale of closeShiftDto.debtSales) {
        const totalAmount = debtSale.quantity * debtSale.unitPrice;

        // Lưu vào shift_debt_sales
        const debtSaleRecord = await manager.save(ShiftDebtSale, {
          shiftId: shift.id,
          customerId: debtSale.customerId,
          productId: debtSale.productId,
          quantity: debtSale.quantity,
          unitPrice: debtSale.unitPrice,
          amount: totalAmount,
          notes: debtSale.notes,
        });

        // ✅ Ghi công nợ (debit customer - PHÁT SINH NỢ)
        // Chỉ dành cho bán công nợ, KHÔNG dùng cho bán lẻ
        await manager.save(DebtLedger, {
          customerId: debtSale.customerId,
          storeId: shift.storeId,
          refType: 'DEBT_SALE',
          refId: debtSaleRecord.id,
          debit: totalAmount,
          credit: 0,
          notes: debtSale.notes || 'Bán công nợ',
          shiftId: shift.id,
        });

        // NOTE: Bán công nợ KHÔNG giảm tồn kho bể, KHÔNG ghi cash_ledger
        // Vì đã tính trong pump readings rồi (bước 4)
        // Công nợ chỉ là PHÂN LOẠI doanh thu: Bán lẻ vs Bán nợ
        // - Bán lẻ → cashIn (bước 5)
        // - Bán nợ → debit customer (không ảnh hưởng cash)

        // Ghi sales (để tracking)
        await manager.save(Sale, {
          shiftId: shift.id,
          storeId: shift.storeId,
          productId: debtSale.productId,
          customerId: debtSale.customerId,
          quantity: debtSale.quantity,
          unitPrice: debtSale.unitPrice,
          amount: totalAmount,
        });
      }
    }

    // 6.2. Xử lý Receipts (phiếu thu tiền - thanh toán nợ)
    if (closeShiftDto.receipts && closeShiftDto.receipts.length > 0) {
      for (const receipt of closeShiftDto.receipts) {
        // Lưu receipt
        const receiptRecord = await manager.save(Receipt, {
          storeId: receipt.storeId,
          shiftId: shift.id,
          receiptType: receipt.receiptType,
          amount: receipt.amount,
          paymentMethod: receipt.paymentMethod || 'CASH',
          notes: receipt.notes,
        });

        // Lưu chi tiết
        for (const detail of receipt.details) {
          await manager.save(ReceiptDetail, {
            shiftId: shift.id,
            receiptId: receiptRecord.id,
            customerId: detail.customerId,
            amount: detail.amount,
          });

          // Ghi công nợ (credit customer - giảm nợ)
          await manager.save(DebtLedger, {
            shiftId: shift.id,
            customerId: detail.customerId,
            storeId: receipt.storeId,
            refType: 'RECEIPT',
            refId: receiptRecord.id,
            debit: 0,
            credit: detail.amount,
            notes: receipt.notes || 'Thanh toán nợ',
          });
        }

        // Ghi sổ quỹ (chỉ nếu thu tiền mặt)
        if (receiptRecord.paymentMethod === 'CASH') {
          await manager.save(CashLedger, {
            shiftId: shift.id,
            storeId: receipt.storeId,
            refType: 'RECEIPT',
            refId: receiptRecord.id,
            cashIn: receipt.amount,
            cashOut: 0,
            notes: receipt.notes || 'Thu tiền thanh toán nợ',
          });
        }
      }
    }

    // 6.3. ✅ Xử lý Deposits (nộp tiền về công ty)
    // Tiền rời khỏi quỹ cửa hàng → cashOut
    // KHÔNG liên quan đến công nợ khách hàng
    if (closeShiftDto.deposits && closeShiftDto.deposits.length > 0) {
      for (const deposit of closeShiftDto.deposits) {
        // Lưu deposit record
        const depositRecord = await manager.save(CashDeposit, {
          storeId: deposit.storeId,
          shiftId: shift.id,
          amount: deposit.amount,
          depositDate: new Date(deposit.depositDate),
          depositTime: deposit.depositTime,
          receiverName: deposit.receiverName,
          paymentMethod: deposit.paymentMethod || 'CASH',
          notes: deposit.notes,
        });

        // ✅ Ghi sổ quỹ: Tiền RA (nộp về công ty)
        // Công thức: Tồn cuối = Tồn đầu + Thu (cashIn) - Nộp (cashOut)
        // Chỉ ghi nếu nộp tiền mặt (không ghi nếu chuyển khoản đã nộp trước)
        if (depositRecord.paymentMethod === 'CASH') {
          await manager.save(CashLedger, {
            storeId: deposit.storeId,
            refType: 'DEPOSIT',
            refId: depositRecord.id,
            cashIn: 0,
            cashOut: deposit.amount,
            notes: deposit.notes || 'Nộp tiền về công ty',
            shiftId: shift.id,
          });
        }
      }
    }

    // 6.4. Xử lý Expenses (chi phí)
    if (closeShiftDto.expenses && closeShiftDto.expenses.length > 0) {
      const today = new Date();

      for (const expense of closeShiftDto.expenses) {
        // Lưu expense record
        const expenseRecord = await manager.save(Expense, {
          storeId: shift.storeId,
          shiftId: shift.id,
          expenseCategoryId: expense.expenseCategoryId,
          amount: expense.amount,
          description: expense.description,
          expenseDate: today,
          paymentMethod: expense.paymentMethod || 'CASH',
          createdBy: user?.id,
        });

        // Ghi sổ quỹ hoặc ngân hàng
        if (expenseRecord.paymentMethod === 'CASH') {
          // Chi bằng tiền mặt - ghi vào cash_ledger
          await manager.save(CashLedger, {
            shiftId: shift.id,
            storeId: shift.storeId,
            refType: 'EXPENSE',
            refId: expenseRecord.id,
            cashIn: 0,
            cashOut: expense.amount,
            notes: expense.description,
          });
        }
        // Nếu BANK_TRANSFER thì không ghi vào cash_ledger (chỉ ghi expense)
      }
    }

    // 6.7. TỰ ĐỘNG TẠO PHIẾU XUẤT BÁN từ lượng bơm qua vòi
    // LƯU Ý: testExport là lượng đổ ra kiểm thử rồi ĐỔ NGƯỢC LẠI vào bể
    // → KHÔNG tạo phiếu xuất cho testExport vì KHÔNG làm giảm tồn kho
    // → CHỈ tạo phiếu xuất cho lượng BÁN thực tế (đã trừ testExport)

    // Tổng hợp lượng BÁN theo từng productId (đã trừ testExport)
    const productSalesMap = new Map<number, number>();
    for (const reading of pumpReadingsData) {
      const current = productSalesMap.get(reading.productId) || 0;
      productSalesMap.set(reading.productId, current + reading.quantity); // quantity đã trừ testExport
    }

    if (productSalesMap.size > 0) {
      // Tạo 1 phiếu xuất duy nhất cho tất cả sản phẩm bán trong ca
      const exportDoc = await manager.save(InventoryDocument, {
        warehouseId: warehouse.id,
        docType: 'EXPORT',
        docDate: new Date(),
        refShiftId: shift.id,
        supplierName: `Xuất bán ca #${shift.shiftNo}`,
        notes: `Tự động tạo từ lượng bơm qua vòi - Ca ${shift.shiftNo} ngày ${shift.shiftDate}`,
      });

      for (const [productId, totalQuantity] of productSalesMap.entries()) {
        // Lấy đơn giá từ pump readings (giả sử tất cả pump cùng sản phẩm có cùng giá)
        const sampleReading = pumpReadingsData.find(
          (r) => r.productId === productId,
        );
        const unitPrice = sampleReading?.unitPrice || 0;

        await manager.save(InventoryDocumentItem, {
          documentId: exportDoc.id,
          productId,
          quantity: totalQuantity,
          unitPrice,
        });

        // Ghi inventory ledger cho phiếu xuất
        await manager.save(InventoryLedger, {
          warehouseId: warehouse.id,
          productId,
          shiftId: shift.id,
          tankId: null, // Không chỉ định tank cụ thể vì tổng hợp từ nhiều pump
          refType: 'EXPORT',
          refId: exportDoc.id,
          quantityIn: 0,
          quantityOut: totalQuantity,
        });

        console.log(
          `🛒 Xuất bán: ${totalQuantity} lít sản phẩm ${productId} (đơn giá ${unitPrice})`,
        );
      }

      console.log(
        `✅ Tạo phiếu xuất tự động từ pump readings - Document ID: ${exportDoc.id}`,
      );
    }

    // 7. Đóng ca
    if (closeShiftDto.closedAt) {
      shift.closedAt = new Date(closeShiftDto.closedAt);
      // Validate closedAt > openedAt
      if (shift.openedAt && shift.closedAt < shift.openedAt) {
        throw new BadRequestException(
          'Thời gian đóng ca không thể trước thời gian mở ca',
        );
      }
    } else {
      shift.closedAt = new Date();
    }

    shift.status = 'CLOSED';
    const updatedShift = await manager.save(shift);

    // 8. Ghi audit log
    await manager.save(AuditLog, {
      tableName: 'shifts',
      recordId: shift.id,
      action: 'CLOSE',
      oldData: { status: oldData.status, closedAt: oldData.closedAt },
      newData: { status: 'CLOSED', closedAt: shift.closedAt },
      changedBy: user?.id,
    });

    return updatedShift;
  }
  async closeShift(
    closeShiftDto: CloseShiftDto,
    user: any,
    _shift?: Shift,
  ): Promise<Shift> {
    return await this.dataSource.transaction(async (manager) => {
      return this.closeShiftProcess(manager, closeShiftDto, user, _shift);
    });
  }

  async reopenShift(shiftId: number, user: any): Promise<Shift> {
    return this.dataSource.transaction(async (manager) => {
      const shift = await manager.findOne(Shift, {
        where: { id: shiftId },
      });

      if (!shift) {
        throw new NotFoundException('Shift not found');
      }

      if (shift.status !== 'CLOSED') {
        throw new BadRequestException('Shift is not closed');
      }

      // ⚠️ CRITICAL CHECK: Nếu đã có payment cho debt sales từ ca này
      const debtSales = await manager.find(ShiftDebtSale, {
        where: { shiftId },
        relations: ['customer'],
      });

      for (const debtSale of debtSales) {
        const debtSaleEntry = await manager.findOne(DebtLedger, {
          where: {
            customerId: debtSale.customerId,
            refType: 'DEBT_SALE',
            refId: debtSale.id,
          },
        });

        if (debtSaleEntry) {
          const paymentsAfterSale = await manager
            .createQueryBuilder(DebtLedger, 'dl')
            .where('dl.customerId = :customerId', {
              customerId: debtSale.customerId,
            })
            .andWhere('dl.refType = :refType', { refType: 'PAYMENT' })
            .andWhere('dl.createdAt > :saleTime', {
              saleTime: debtSaleEntry.createdAt,
            })
            .getCount();

          if (paymentsAfterSale > 0) {
            throw new BadRequestException(
              `❌ KHÔNG THỂ MỞ LẠI CA!\n` +
                `Khách hàng "${debtSale.customer?.name}" đã thanh toán công nợ từ ca này.\n` +
                `Nếu sửa số tiền bán sẽ gây lỗi số dư công nợ.\n\n` +
                `Giải pháp:\n` +
                `1. Tạo bút toán điều chỉnh công nợ (ghi chú rõ lý do)\n` +
                `2. Hoặc hoàn tiền cho khách nếu bán sai số tiền cao hơn\n` +
                `3. Liên hệ kế toán trưởng để xử lý thủ công`,
            );
          }
        }
      }

      const oldData = { ...shift };

      // 🔄 SOFT DELETE STRATEGY:
      // Đánh dấu dữ liệu cũ là "đã bị thay thế" thay vì xóa hẳn

      // 1. Tìm và xóa phiếu xuất tự động của ca này
      // Cập nhật logic: Tìm theo warehouse và (refShiftId HOẶC supplierName)
      const warehouse = await manager.findOne(Warehouse, {
        where: { storeId: shift.storeId, type: 'STORE' },
      });

      if (warehouse) {
        const exportDocs = await manager
          .createQueryBuilder(InventoryDocument, 'doc')
          .where('doc.doc_type = :docType', { docType: 'EXPORT' })
          .andWhere('doc.warehouse_id = :warehouseId', {
            warehouseId: warehouse.id,
          })
          .andWhere(
            new Brackets((qb) => {
              qb.where('doc.ref_shift_id = :shiftId', {
                shiftId: shift.id,
              }).orWhere('doc.supplier_name = :supplierName', {
                supplierName: `Xuất bán ca #${shift.shiftNo}`,
              });
            }),
          )
          .getMany();

        for (const doc of exportDocs) {
          // Xóa inventory_ledger entries của phiếu xuất này
          await manager
            .createQueryBuilder()
            .delete()
            .from('inventory_ledger')
            .where('ref_type = :refType', { refType: 'EXPORT' })
            .andWhere('ref_id = :refId', { refId: doc.id })
            .execute();

          // Xóa inventory_document_items
          await manager
            .createQueryBuilder()
            .delete()
            .from('inventory_document_items')
            .where('document_id = :docId', { docId: doc.id })
            .execute();

          // Xóa inventory_document
          await manager
            .createQueryBuilder()
            .delete()
            .from('inventory_documents')
            .where('id = :docId', { docId: doc.id })
            .execute();
        }
      }

      // 2. Đánh dấu cash_ledger entries
      await manager
        .createQueryBuilder()
        .update('cash_ledger')
        .set({
          supersededByShiftId: () => 'NULL',
          notes: () => `CONCAT(COALESCE(notes, ''), ' [ĐIỀU CHỈNH]')`,
        })
        .where('ref_type = :refType', { refType: 'SHIFT_CLOSE' })
        .andWhere('ref_id = :refId', { refId: shiftId })
        .execute();

      // 3. Đánh dấu debt_ledger entries (bán công nợ)
      const debtSaleIds = debtSales.map((ds) => ds.id);
      if (debtSaleIds.length > 0) {
        await manager
          .createQueryBuilder()
          .update('debt_ledger')
          .set({
            supersededByShiftId: () => 'NULL',
            notes: () => `CONCAT(COALESCE(notes, ''), ' [ĐIỀU CHỈNH]')`,
          })
          .where('ref_type = :refType', { refType: 'DEBT_SALE' })
          .andWhere('ref_id IN (:...refIds)', { refIds: debtSaleIds })
          .execute();
      }

      // 4. Đánh dấu pump_readings (không xóa để audit)
      await manager
        .createQueryBuilder()
        .update('pump_readings')
        .set({ supersededByShiftId: () => 'NULL' })
        .where('shift_id = :shiftId', { shiftId })
        .execute();

      // 5. Đánh dấu sales
      await manager
        .createQueryBuilder()
        .update('sales')
        .set({ supersededByShiftId: () => 'NULL' })
        .where('shift_id = :shiftId', { shiftId })
        .execute();

      console.log(
        `🔄 Marked all data from shift ${shiftId} as SUPERSEDED (kept for audit)`,
      );

      // 6. Mở lại ca (KHÔNG tạo ca mới, dùng luôn ca cũ)
      shift.status = 'OPEN';
      shift.closedAt = null;
      const reopenedShift = await manager.save(Shift, shift);

      // Ghi audit log
      await manager.save(AuditLog, {
        tableName: 'shifts',
        recordId: shift.id,
        action: 'REOPEN',
        oldData: { status: oldData.status, closedAt: oldData.closedAt },
        newData: {
          status: 'OPEN',
          closedAt: null,
          note: 'Dữ liệu cũ được đánh dấu superseded, giữ nguyên timestamp',
        },
        changedBy: user?.id,
      });

      console.log(
        `✅ Shift ${shiftId} reopened. Old data marked as superseded.`,
      );
      return reopenedShift;
    });
  }

  async findOne(id: number): Promise<Shift> {
    const shift = await this.shiftRepository.findOne({
      where: { id },
      relations: ['store'],
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    return shift;
  }

  async getShiftReport(shiftId: number) {
    const shift = await this.shiftRepository.findOne({
      where: { id: shiftId },
      relations: [
        'pumpReadings',
        'pumpReadings.product',
        'sales',
        'sales.product',
        'store',
      ],
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    // Tính tổng doanh thu từ vòi bơm (hoặc sales nếu đã chốt ca)
    let totalFromPumps = 0;

    if (shift.pumpReadings && shift.pumpReadings.length > 0) {
      // Nếu có pump readings, tính từ đó
      for (const reading of shift.pumpReadings) {
        // Lấy giá bán hiện tại
        const price = await this.productPriceRepository
          .createQueryBuilder('pp')
          .where('pp.product_id = :productId', { productId: reading.productId })
          .andWhere('pp.region_id = :regionId', {
            regionId: shift.store.regionId,
          })
          .andWhere('pp.valid_from <= :now', { now: new Date() })
          .andWhere('(pp.valid_to IS NULL OR pp.valid_to > :now)', {
            now: new Date(),
          })
          .getOne();

        if (price) {
          totalFromPumps += reading.quantity * Number(price.price);
        }
      }
    } else if (shift.sales && shift.sales.length > 0) {
      // Nếu chưa có pump readings nhưng đã có sales (ca đã chốt)
      totalFromPumps = shift.sales.reduce(
        (sum, sale) => sum + Number(sale.amount),
        0,
      );
    }

    // Lấy doanh số bán công nợ
    const debtSales = await this.getShiftDebtSales(shiftId);
    const totalDebtSales = debtSales.reduce(
      (sum, sale) => sum + Number(sale.amount),
      0,
    );

    // Bán lẻ = Tổng từ vòi bơm - Công nợ
    const totalRetailSales = totalFromPumps - totalDebtSales;

    // Lấy phiếu thu tiền (receipts - thanh toán nợ)
    const receipts = await this.getShiftReceipts(shiftId);
    const totalReceipts = receipts.reduce(
      (sum, receipt) => sum + Number(receipt.amount),
      0,
    );

    // Lấy phiếu nộp tiền
    const cashDeposits = await this.getShiftCashDeposits(shiftId);
    const totalDeposits = cashDeposits.reduce(
      (sum, deposit) => sum + Number(deposit.amount),
      0,
    );

    // Tính số dư quỹ thực tế từ cash_ledger
    const cashLedgerBalance = await this.cashLedgerRepository
      .createQueryBuilder('cl')
      .select('COALESCE(SUM(cl.cash_in - cl.cash_out), 0)', 'balance')
      .where('cl.store_id = :storeId', { storeId: shift.storeId })
      .getRawOne();
    const actualCashBalance = Number(cashLedgerBalance?.balance || 0);

    // Biến động tiền mặt trong ca này
    const cashMovementInShift =
      totalRetailSales + totalReceipts - totalDeposits;

    return {
      shift,
      summary: {
        totalRetailSales, // Bán lẻ = Tổng vòi bơm - Công nợ
        totalDebtSales, // Bán công nợ
        totalRevenue: totalFromPumps, // Tổng doanh thu = Tổng từ vòi bơm
        totalReceipts, // Thu tiền (thanh toán nợ)
        totalDeposits, // Nộp về công ty
        cashMovement: cashMovementInShift, // Biến động tiền mặt trong ca
        actualCashBalance, // Số dư quỹ thực tế (từ cash_ledger)
        // Legacy field for backward compatibility
        cashBalance: cashMovementInShift,
      },
      pumpReadings: shift.pumpReadings,
      retailSales: shift.sales.filter((sale) => !sale.customerId),
      debtSales,
      receipts,
      cashDeposits,
    };
  }

  async findByStore(storeId: number, limit = 20) {
    return this.shiftRepository.find({
      where: { storeId },
      order: { shiftDate: 'DESC', shiftNo: 'DESC' },
      take: limit,
    });
  }

  async findAll(limit = 100) {
    return this.shiftRepository.find({
      order: { shiftDate: 'DESC', shiftNo: 'DESC' },
      take: limit,
      relations: ['store'],
    });
  }

  // ==================== SHIFT DEBT SALES ====================

  async createDebtSale(createDto: CreateShiftDebtSaleDto, user: any) {
    return await this.dataSource.transaction(async (manager) => {
      // Kiểm tra shift còn mở không
      const shift = await manager.findOne(Shift, {
        where: { id: createDto.shiftId },
        relations: ['store'],
      });

      if (!shift) {
        throw new NotFoundException('Shift not found');
      }

      if (shift.status !== 'OPEN') {
        throw new BadRequestException('Cannot add debt sale to closed shift');
      }

      // 1. Tạo shift debt sale
      const amount = createDto.quantity * createDto.unitPrice;
      const debtSale = manager.create(ShiftDebtSale, {
        ...createDto,
        amount,
      });
      const savedDebtSale = await manager.save(debtSale);

      // 2. Ghi debt ledger (phát sinh nợ)
      const debtLedger = manager.create(DebtLedger, {
        shiftId: shift.id,
        customerId: createDto.customerId,
        storeId: shift.storeId,
        refType: 'SHIFT_DEBT_SALE',
        refId: savedDebtSale.id,
        debit: amount,
        credit: 0,
      });
      await manager.save(debtLedger);

      // 3. Ghi inventory ledger (xuất kho)
      // TODO: Lấy warehouse ID từ store
      const warehouseId = 1; // Simplified
      const inventoryLedger = manager.create(InventoryLedger, {
        warehouseId,
        productId: createDto.productId,
        refType: 'SHIFT_DEBT_SALE',
        refId: savedDebtSale.id,
        quantityOut: createDto.quantity,
        quantityIn: 0,
      });
      await manager.save(inventoryLedger);

      // 4. Tạo Sale record
      const sale = manager.create(Sale, {
        shiftId: createDto.shiftId,
        storeId: shift.storeId,
        customerId: createDto.customerId,
        productId: createDto.productId,
        quantity: createDto.quantity,
        unitPrice: createDto.unitPrice,
        amount,
      });
      await manager.save(sale);

      return savedDebtSale;
    });
  }

  async getShiftDebtSales(shiftId: number) {
    return this.shiftDebtSaleRepository.find({
      where: { shiftId },
      relations: ['customer', 'product'],
      order: { createdAt: 'ASC' },
    });
  }

  async deleteDebtSale(id: number) {
    const debtSale = await this.shiftDebtSaleRepository.findOne({
      where: { id },
      relations: ['shift'],
    });

    if (!debtSale) {
      throw new NotFoundException('Debt sale not found');
    }

    // Kiểm tra ca đã đóng chưa
    if (debtSale.shift?.status !== 'OPEN') {
      throw new BadRequestException(
        'Cannot delete debt sale from closed or adjusted shift',
      );
    }

    return await this.dataSource.transaction(async (manager) => {
      // Xóa debt ledger
      await manager.delete(DebtLedger, {
        refType: 'SHIFT_DEBT_SALE',
        refId: id,
      });

      // Xóa inventory ledger
      await manager.delete(InventoryLedger, {
        refType: 'SHIFT_DEBT_SALE',
        refId: id,
      });

      // Xóa sale record
      await manager.delete(Sale, {
        shiftId: debtSale.shiftId,
        customerId: debtSale.customerId,
        productId: debtSale.productId,
        quantity: debtSale.quantity,
        amount: debtSale.amount,
      });

      // Xóa debt sale
      await manager.delete(ShiftDebtSale, id);

      return { success: true };
    });
  }

  // ==================== CASH DEPOSITS ====================

  async createCashDeposit(createDto: CreateCashDepositDto, user: any) {
    return await this.dataSource.transaction(async (manager) => {
      // Kiểm tra shift còn mở không
      const shift = await manager.findOne(Shift, {
        where: { id: createDto.shiftId },
      });

      if (!shift) {
        throw new NotFoundException('Shift not found');
      }

      if (shift.status !== 'OPEN') {
        throw new BadRequestException('Cannot add deposit to closed shift');
      }

      // Validate amount > 0
      if (createDto.amount <= 0) {
        throw new BadRequestException('Deposit amount must be greater than 0');
      }

      // 1. Tạo cash deposit
      const deposit = manager.create(CashDeposit, {
        ...createDto,
        createdBy: user?.id,
      });
      const savedDeposit = await manager.save(deposit);

      // 2. Ghi cash ledger (tiền ra - nộp về công ty)
      const cashLedger = manager.create(CashLedger, {
        storeId: createDto.storeId,
        refType: 'DEPOSIT',
        refId: savedDeposit.id,
        cashIn: 0,
        cashOut: createDto.amount,
        shiftId: shift.id,
      });
      await manager.save(cashLedger);

      return savedDeposit;
    });
  }

  async getCashDeposits(storeId: number, fromDate?: string, toDate?: string) {
    const query = this.cashDepositRepository
      .createQueryBuilder('cd')
      .where('cd.store_id = :storeId', { storeId })
      .leftJoinAndSelect('cd.shift', 'shift')
      .leftJoinAndSelect('cd.creator', 'creator')
      .orderBy('cd.deposit_date', 'DESC')
      .addOrderBy('cd.created_at', 'DESC');

    if (fromDate) {
      query.andWhere('cd.deposit_date >= :fromDate', { fromDate });
    }
    if (toDate) {
      query.andWhere('cd.deposit_date <= :toDate', { toDate });
    }

    return query.getMany();
  }

  async getShiftCashDeposits(shiftId: number) {
    return this.cashDepositRepository.find({
      where: { shiftId },
      relations: ['creator'],
      order: { createdAt: 'ASC' },
    });
  }

  // ==================== RECEIPTS (PHIẾU THU) ====================

  async createReceipt(createDto: CreateReceiptDto, user: any) {
    return await this.dataSource.transaction(async (manager) => {
      // Kiểm tra shift còn mở không (nếu có shiftId)
      if (createDto.shiftId) {
        const shift = await manager.findOne(Shift, {
          where: { id: createDto.shiftId },
        });

        if (!shift) {
          throw new NotFoundException('Shift not found');
        }

        if (shift.status !== 'OPEN') {
          throw new BadRequestException('Cannot add receipt to closed shift');
        }
      }

      // Validate amount > 0
      if (createDto.amount <= 0) {
        throw new BadRequestException('Receipt amount must be greater than 0');
      }

      // Validate details
      if (!createDto.details || createDto.details.length === 0) {
        throw new BadRequestException('Receipt must have at least one detail');
      }

      const totalDetailAmount = createDto.details.reduce(
        (sum, d) => sum + d.amount,
        0,
      );
      if (Math.abs(totalDetailAmount - createDto.amount) > 0.01) {
        throw new BadRequestException(
          'Total detail amount must equal receipt amount',
        );
      }

      // 1. Tạo phiếu thu
      const receipt = manager.create(Receipt, {
        storeId: createDto.storeId,
        shiftId: createDto.shiftId,
        receiptType: createDto.receiptType,
        amount: createDto.amount,
        notes: createDto.notes,
      });
      const savedReceipt = await manager.save(receipt);

      // 2. Tạo chi tiết phiếu thu (từng khách hàng)
      for (const detail of createDto.details) {
        const receiptDetail = manager.create(ReceiptDetail, {
          shiftId: createDto.shiftId,
          receiptId: savedReceipt.id,
          customerId: detail.customerId,
          amount: detail.amount,
        });
        await manager.save(receiptDetail);

        // 3. Ghi giảm nợ cho khách
        await manager.save(DebtLedger, {
          shiftId: createDto.shiftId,
          customerId: detail.customerId,
          storeId: createDto.storeId,
          refType: 'RECEIPT',
          refId: savedReceipt.id,
          debit: 0,
          credit: detail.amount, // Giảm nợ
        });
      }

      // 4. ⭐ GHI SỔ QUỸ: Thu tiền vào
      await manager.save(CashLedger, {
        shiftId: createDto.shiftId,
        storeId: createDto.storeId,
        refType: 'RECEIPT',
        refId: savedReceipt.id,
        cashIn: createDto.amount,
        cashOut: 0,
      });

      return savedReceipt;
    });
  }

  async getShiftReceipts(shiftId: number) {
    const receipts = await this.receiptRepository.find({
      where: { shiftId },
      relations: ['receiptDetails', 'receiptDetails.customer'],
      order: { createdAt: 'ASC' },
    });

    console.log(`📋 Found ${receipts.length} receipts for shift ${shiftId}`);
    return receipts;
  }

  // ==================== PREVIOUS SHIFT READINGS ====================

  async getPreviousShiftReadings(shiftId: number) {
    // Lấy thông tin ca hiện tại
    const currentShift = await this.shiftRepository.findOne({
      where: { id: shiftId },
    });

    if (!currentShift) {
      throw new NotFoundException('Shift not found');
    }

    // Tìm ca trước đó của cùng cửa hàng (theo thứ tự ngày và số ca)
    const previousShift = await this.shiftRepository
      .createQueryBuilder('shift')
      .where('shift.store_id = :storeId', { storeId: currentShift.storeId })
      .andWhere(
        '(shift.shift_date < :currentDate OR (shift.shift_date = :currentDate AND shift.shift_no < :currentShiftNo))',
        {
          currentDate: currentShift.shiftDate,
          currentShiftNo: currentShift.shiftNo,
        },
      )
      .orderBy('shift.shift_date', 'DESC')
      .addOrderBy('shift.shift_no', 'DESC')
      .getOne();

    if (!previousShift) {
      // Không có ca trước, trả về object rỗng
      return { hasPreviousShift: false, readings: {} };
    }

    // Lấy pump readings của ca trước
    const previousReadings = await this.pumpReadingRepository.find({
      where: { shiftId: previousShift.id },
    });

    // Chuyển đổi thành map: pumpCode -> endValue
    const readingsMap: Record<string, number> = {};
    previousReadings.forEach((reading) => {
      readingsMap[reading.pumpCode] = reading.endValue;
    });

    return {
      hasPreviousShift: true,
      previousShiftId: previousShift.id,
      previousShiftDate: previousShift.shiftDate,
      previousShiftNo: previousShift.shiftNo,
      readings: readingsMap,
    };
  }
}
