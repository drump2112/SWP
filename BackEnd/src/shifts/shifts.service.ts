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
import { Product } from '../entities/product.entity';
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
import { ShiftCheckpoint } from '../entities/shift-checkpoint.entity';
import { ShiftCheckpointReading } from '../entities/shift-checkpoint-reading.entity';
import { ShiftCheckpointStock } from '../entities/shift-checkpoint-stock.entity';
import { CreateShiftDto } from './dto/create-shift.dto';
import { CloseShiftDto } from './dto/close-shift.dto';
import { CreateCheckpointDto } from './dto/create-checkpoint.dto';
import { UpdateOpeningInfoDto } from './dto/update-opening-info.dto';
import { UpdateShiftTimesDto } from './dto/update-shift-times.dto';
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
      handoverName: createShiftDto.handoverName || null,
      receiverName: createShiftDto.receiverName || null,
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

    // ⏰ Xác định closedAt TRƯỚC để dùng cho các phiếu xuất/nhập/chi phí
    const closedAt = closeShiftDto.closedAt
      ? new Date(closeShiftDto.closedAt)
      : new Date();

    // Validate closedAt > openedAt ngay từ đầu
    if (shift.openedAt && closedAt < shift.openedAt) {
      throw new BadRequestException(
        'Thời gian đóng ca không thể trước thời gian mở ca',
      );
    }

    // 1. Lưu số liệu cột bơm (bulk insert với unitPrice để lưu vết giá)
    // Lấy giá trước để dùng cho cả pump_readings và sales
    const productIds = [
      ...new Set(closeShiftDto.pumpReadings.map((r) => r.productId)),
    ];

    // ✅ QUAN TRỌNG: Lấy giá tại thời điểm MỞ CA (openedAt), không phải thời điểm hiện tại
    // Điều này đảm bảo rằng nếu giá thay đổi giữa chừng (ví dụ: đổi giá lúc 15h),
    // ca đã mở trước đó vẫn sử dụng giá đúng tại thời điểm mở ca
    const priceReferenceTime = shift.openedAt || new Date();
    console.log(`📊 Lấy giá tại thời điểm mở ca: ${priceReferenceTime.toISOString()}`);

    const prices = await manager
      .createQueryBuilder(ProductPrice, 'pp')
      .where('pp.product_id IN (:...productIds)', { productIds })
      .andWhere('pp.region_id = :regionId', { regionId: shift.store.regionId })
      .andWhere('pp.valid_from <= :priceReferenceTime', { priceReferenceTime })
      .andWhere('(pp.valid_to IS NULL OR pp.valid_to > :priceReferenceTime)', { priceReferenceTime })
      .orderBy('pp.valid_from', 'DESC') // Lấy giá mới nhất trước
      .getMany();

    // Map giá theo productId - chỉ lấy giá đầu tiên (mới nhất) cho mỗi sản phẩm
    const priceMap = new Map<number, number>();
    for (const price of prices) {
      // Chỉ set nếu chưa có (vì đã sort DESC theo validFrom, nên record đầu là mới nhất)
      if (!priceMap.has(price.productId)) {
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
        pumpId: reading.pumpId, // ✅ Lưu pumpId để query tankId sau
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
        amount: Math.round(reading.quantity * unitPrice), // Làm tròn để tránh phần thập phân
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
    // Ưu tiên sử dụng amount từ frontend (tránh sai số làm tròn)
    const totalDebtSalesAmount = (closeShiftDto.debtSales || []).reduce(
      (sum, ds) => sum + (ds.amount ?? Math.round(ds.quantity * ds.unitPrice)),
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
        ledgerAt: closedAt, // ⏰ Dùng thời gian chốt ca
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
        // Ưu tiên sử dụng amount từ frontend (tránh sai số làm tròn)
        const totalAmount = debtSale.amount ?? Math.round(debtSale.quantity * debtSale.unitPrice);
        const currentTotal = debtByCustomer.get(debtSale.customerId) || 0;
        debtByCustomer.set(debtSale.customerId, currentTotal + totalAmount);
      }

      // Validate từng khách hàng (bỏ qua khách hàng nội bộ - INTERNAL)
      for (const [customerId, newDebtAmount] of debtByCustomer) {
        try {
          // Lấy thông tin khách hàng để kiểm tra type
          const customer = await manager.findOne(Customer, {
            where: { id: customerId },
            select: ['id', 'name', 'code', 'type'],
          });

          // Bỏ qua validate nếu là khách hàng nội bộ
          if (customer?.type === 'INTERNAL') {
            continue;
          }

          const validation = await this.customersService.validateDebtLimit(
            customerId,
            shift.storeId,
            newDebtAmount,
          );

          if (!validation.isValid) {
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
        // Ưu tiên sử dụng amount từ frontend (tránh sai số làm tròn)
        const totalAmount = debtSale.amount ?? Math.round(debtSale.quantity * debtSale.unitPrice);

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
          ledgerAt: closedAt, // ⏰ Dùng thời gian chốt ca
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

    // 6.2. ✅ Xử lý Retail Sales (ghi nhận cho khách hàng nội bộ để kiểm soát tiền)
    // LƯU Ý QUAN TRỌNG:
    // - Lượng bán lẻ ĐÃ ĐƯỢC ghi vào bảng sales ở Bước 2 (từ pump readings, customerId=null)
    // - KHÔNG ghi vào shift_debt_sales vì sẽ làm sai báo cáo doanh thu/xuất hàng
    //   (báo cáo tính: Bán lẻ = Tổng pump - shift_debt_sales)
    // - Chỉ ghi DEBIT vào debt_ledger → khách nội bộ NỢ tiền bán lẻ
    // - CREDIT sẽ được ghi khi có phiếu nộp tiền về công ty (deposit)
    if (closeShiftDto.retailSales && closeShiftDto.retailSales.length > 0) {
      for (const retailSale of closeShiftDto.retailSales) {
        const totalAmount = Math.round(retailSale.quantity * retailSale.unitPrice); // Làm tròn để tránh phần thập phân

        // Lấy tên sản phẩm để ghi vào notes
        const product = await manager.findOne(Product, {
          where: { id: retailSale.productId },
          select: ['id', 'name'],
        });
        const productName = product?.name || `SP${retailSale.productId}`;

        // ✅ Ghi công nợ DEBIT (phát sinh nợ) - khách nội bộ NỢ tiền bán lẻ
        await manager.save(DebtLedger, {
          customerId: retailSale.customerId,
          storeId: shift.storeId,
          refType: 'RETAIL_SALE',
          refId: shift.id, // Ref đến shift
          debit: totalAmount,
          credit: 0,
          notes: `Bán lẻ ${retailSale.quantity.toFixed(3)} lít ${productName}`,
          shiftId: shift.id,
          ledgerAt: closedAt, // ⏰ Dùng thời gian chốt ca
        });

        // ❌ KHÔNG ghi CREDIT ở đây
        // CREDIT sẽ được ghi khi có phiếu nộp tiền về công ty (deposit)
        // → Công nợ khách nội bộ = Tổng DEBIT (bán lẻ) - Tổng CREDIT (đã nộp)
      }
    }

    // 6.3. Xử lý Receipts (phiếu thu tiền - thanh toán nợ)
    if (closeShiftDto.receipts && closeShiftDto.receipts.length > 0) {
      for (const receipt of closeShiftDto.receipts) {
        // Lưu receipt với thời gian thu tiền do người dùng chọn
        const receiptRecord = await manager.save(Receipt, {
          storeId: receipt.storeId,
          shiftId: shift.id,
          receiptType: receipt.receiptType,
          amount: receipt.amount,
          paymentMethod: receipt.paymentMethod || 'CASH',
          notes: receipt.notes,
          receiptAt: receipt.receiptAt ? new Date(receipt.receiptAt) : new Date(),
        }) as Receipt;

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
            ledgerAt: receiptRecord.receiptAt || closedAt, // ⏰ Dùng thời gian phiếu thu hoặc chốt ca
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
            ledgerAt: receiptRecord.receiptAt || closedAt, // ⏰ Dùng thời gian phiếu thu hoặc thời gian chốt ca
            notes: receipt.notes || 'Thu tiền thanh toán nợ',
          });
        }
      }
    }

    // 6.3. ✅ Xử lý Deposits (nộp tiền về công ty)
    // Tiền rời khỏi quỹ cửa hàng → cashOut
    // ✅ Ghi CREDIT cho khách hàng nội bộ (giảm nợ khi nộp tiền)
    if (closeShiftDto.deposits && closeShiftDto.deposits.length > 0) {
      // Tìm khách hàng nội bộ của cửa hàng để ghi CREDIT
      const internalCustomer = await manager.findOne(Customer, {
        where: {
          type: 'INTERNAL',
        },
        relations: ['customerStores'],
      }).then(async () => {
        // Tìm khách hàng nội bộ qua customer_stores
        const customerStore = await manager
          .createQueryBuilder()
          .select('cs.customerId', 'customerId')
          .from('customer_stores', 'cs')
          .innerJoin('customers', 'c', 'c.id = cs.customerId')
          .where('cs.storeId = :storeId', { storeId: shift.storeId })
          .andWhere('c.type = :type', { type: 'INTERNAL' })
          .getRawOne();
        return customerStore?.customerId || null;
      });

      for (const deposit of closeShiftDto.deposits) {
        // Lưu deposit record
        const depositRecord = await manager.save(CashDeposit, {
          storeId: deposit.storeId,
          shiftId: shift.id,
          amount: deposit.amount,
          depositAt: deposit.depositAt ? new Date(deposit.depositAt) : new Date(),
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
            ledgerAt: depositRecord.depositAt || closedAt, // ⏰ Dùng thời gian nộp tiền hoặc thời gian chốt ca
            notes: deposit.notes || 'Nộp tiền về công ty',
            shiftId: shift.id,
          });

          // ✅ Ghi CREDIT cho khách hàng nội bộ (giảm nợ khi nộp tiền)
          // CHỈ ghi nếu sourceType = 'RETAIL' hoặc không có sourceType (mặc định là bán lẻ)
          // KHÔNG ghi nếu sourceType = 'RECEIPT' (tiền từ phiếu thu - đã ghi CREDIT cho khách EXTERNAL rồi)
          if (internalCustomer && deposit.sourceType !== 'RECEIPT') {
            await manager.save(DebtLedger, {
              customerId: internalCustomer,
              storeId: shift.storeId,
              refType: 'DEPOSIT',
              refId: depositRecord.id,
              debit: 0,
              credit: deposit.amount,
              notes: deposit.notes || 'Nộp tiền về công ty - Giảm nợ',
              shiftId: shift.id,
              ledgerAt: depositRecord.depositAt || closedAt, // ⏰ Dùng thời gian nộp tiền hoặc chốt ca
            });
          }
        }
      }
    }

    // 6.4. Xử lý Expenses (chi phí)
    if (closeShiftDto.expenses && closeShiftDto.expenses.length > 0) {
      for (const expense of closeShiftDto.expenses) {
        // Lưu expense record
        const expenseRecord = await manager.save(Expense, {
          storeId: shift.storeId,
          shiftId: shift.id,
          expenseCategoryId: expense.expenseCategoryId,
          amount: expense.amount,
          description: expense.description,
          expenseDate: closedAt, // ⏰ Dùng thời gian chốt ca
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
            ledgerAt: closedAt, // ⏰ Dùng thời gian chốt ca
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

    // 🔥 Query pumps để lấy tankId từ pumpId (1 bồn có thể có nhiều vòi)
    const pumpIds = closeShiftDto.pumpReadings
      .filter((r) => r.pumpId)
      .map((r) => r.pumpId);

    let pumpToTankMap = new Map<number, number>();

    if (pumpIds.length > 0) {
      const pumps = await manager
        .createQueryBuilder()
        .select(['p.id as "pumpId"', 'p.tank_id as "tankId"'])
        .from('pumps', 'p')
        .where('p.id IN (:...pumpIds)', { pumpIds })
        .getRawMany();

      // Tạo map pumpId -> tankId
      for (const pump of pumps) {
        pumpToTankMap.set(Number(pump.pumpId), pump.tankId);
      }
    }

    // Tổng hợp lượng BÁN theo từng TANK + PRODUCT (thay vì chỉ productId)
    // Key: "tankId-productId", Value: { tankId, productId, quantity, unitPrice }
    const tankSalesMap = new Map<string, { tankId: number; productId: number; quantity: number; unitPrice: number }>();
    for (const reading of pumpReadingsData) {
      const tankId = reading.pumpId ? pumpToTankMap.get(reading.pumpId) : null;
      if (!tankId) {
        console.warn(`⚠️ Không tìm thấy tankId cho pump ${reading.pumpCode} (pumpId: ${reading.pumpId})`);
        continue;
      }
      const key = `${tankId}-${reading.productId}`;
      const existing = tankSalesMap.get(key);
      if (existing) {
        existing.quantity += reading.quantity;
      } else {
        tankSalesMap.set(key, {
          tankId,
          productId: reading.productId,
          quantity: reading.quantity,
          unitPrice: reading.unitPrice,
        });
      }
    }

    if (tankSalesMap.size > 0) {
      // Tạo 1 phiếu xuất duy nhất cho tất cả sản phẩm bán trong ca
      const exportDoc = await manager.save(InventoryDocument, {
        warehouseId: warehouse.id,
        docType: 'EXPORT',
        docDate: closedAt,
        docAt: closedAt, // ⏰ Dùng thời gian chốt ca thay vì thời gian hiện tại
        refShiftId: shift.id,
        supplierName: `Xuất bán ca #${shift.shiftNo}`,
        notes: `Tự động tạo từ lượng bơm qua vòi - Ca ${shift.shiftNo} ngày ${shift.shiftDate}`,
      });

      for (const [, sale] of tankSalesMap.entries()) {
        const { tankId, productId, quantity: totalQuantity, unitPrice } = sale;

        await manager.save(InventoryDocumentItem, {
          documentId: exportDoc.id,
          productId,
          tankId, // ✅ Ghi tankId vào document item
          quantity: totalQuantity,
          unitPrice,
        });

        // 🔥 Ghi inventory ledger THEO TANK (không trừ trực tiếp vào tanks.current_stock)
        // Tồn kho tính bằng: SUM(quantity_in - quantity_out) WHERE tank_id = X
        await manager.save(InventoryLedger, {
          warehouseId: warehouse.id,
          productId,
          shiftId: shift.id,
          tankId, // ✅ Ghi tankId để trừ tồn theo bể
          refType: 'EXPORT',
          refId: exportDoc.id,
          quantityIn: 0,
          quantityOut: totalQuantity,
        });

        console.log(
          `🛒 Xuất bán: ${totalQuantity} lít sản phẩm ${productId} từ bể ${tankId} (đơn giá ${unitPrice})`,
        );
      }

      console.log(
        `✅ Tạo phiếu xuất tự động từ pump readings - Document ID: ${exportDoc.id}`,
      );
    }

    // 6.8. Xử lý phiếu nhập hàng (inventoryImports)
    if (closeShiftDto.inventoryImports && closeShiftDto.inventoryImports.length > 0) {
      for (const importItem of closeShiftDto.inventoryImports) {
        // Tạo document nhập
        const importDoc = await manager.save(InventoryDocument, {
          warehouseId: warehouse.id,
          docType: 'IMPORT',
          docDate: importItem.docAt ? new Date(importItem.docAt) : new Date(),
          docAt: importItem.docAt ? new Date(importItem.docAt) : new Date(),
          refShiftId: shift.id,
          supplierName: importItem.supplierName,
          licensePlate: importItem.licensePlate,
          notes: importItem.notes,
        });

        // Tạo item (với tankId nếu có)
        await manager.save(InventoryDocumentItem, {
          documentId: importDoc.id,
          productId: importItem.productId,
          tankId: importItem.tankId || undefined, // ✅ Thêm tankId
          quantity: importItem.quantity,
          unitPrice: 0,
        });

        // Ghi inventory ledger (tăng tồn kho) - THEO BỂ nếu có tankId
        await manager.save(InventoryLedger, {
          warehouseId: warehouse.id,
          productId: importItem.productId,
          shiftId: shift.id,
          tankId: importItem.tankId || undefined, // ✅ Ghi vào bể nếu có
          refType: 'IMPORT',
          refId: importDoc.id,
          quantityIn: importItem.quantity,
          quantityOut: 0,
        });

        console.log(
          `📥 Nhập kho: ${importItem.quantity} lít sản phẩm ${importItem.productId} vào bể ${importItem.tankId || 'N/A'} (Nhà cung cấp: ${importItem.supplierName || 'N/A'})`,
        );
      }
    }

    // 7. Đóng ca - Sử dụng closedAt đã xác định ở đầu hàm
    shift.closedAt = closedAt;

    // Lưu thông tin người giao và người nhận
    if (closeShiftDto.handoverName) {
      shift.handoverName = closeShiftDto.handoverName;
    }
    if (closeShiftDto.receiverName) {
      shift.receiverName = closeShiftDto.receiverName;
    }

    // 7.1. ✅ Tính tồn đầu ca (opening_stock_json)
    // Lấy warehouse_id của store hiện tại
    const storeWarehouse = await manager.findOne(Warehouse, {
      where: { storeId: shift.storeId },
    });

    if (!storeWarehouse) {
      throw new BadRequestException(
        `Store ${shift.storeId} không có warehouse`,
      );
    }

    const warehouseId = storeWarehouse.id;
    const products = await manager.find(Product);
    const openingStockData: any[] = [];

    for (const product of products) {
      let openingStock = 0;

      // Kiểm tra có shift trước cùng store không
      const prevShift = await manager
        .createQueryBuilder(Shift, 's')
        .where('s.store_id = :storeId', { storeId: shift.storeId })
        .andWhere('(s.shift_date < :shiftDate OR (s.shift_date = :shiftDate AND s.shift_no < :shiftNo))', {
          shiftDate: shift.shiftDate,
          shiftNo: shift.shiftNo,
        })
        .orderBy('s.shift_date', 'DESC')
        .addOrderBy('s.shift_no', 'DESC')
        .limit(1)
        .getOne();

      if (prevShift && prevShift.openingStockJson) {
        // Lấy opening của shift trước
        const prevOpening = (prevShift.openingStockJson as any[]).find(
          (x) => x.productId === product.id,
        );
        const prevOpeningStock = prevOpening?.openingStock || 0;

        // Lấy import/export của shift trước từ ledger (dùng warehouseId đúng)
        const prevLedger = await manager
          .createQueryBuilder(InventoryLedger, 'il')
          .select('SUM(il.quantity_in)', 'totalImport')
          .addSelect('SUM(il.quantity_out)', 'totalExport')
          .where('il.product_id = :productId', { productId: product.id })
          .andWhere('il.warehouse_id = :warehouseId', { warehouseId })
          .andWhere('il.shift_id = :shiftId', { shiftId: prevShift.id })
          .getRawOne();

        const prevImport = Number(prevLedger?.totalImport) || 0;
        const prevExport = Number(prevLedger?.totalExport) || 0;
        const prevClosing = prevOpeningStock + prevImport - prevExport;

        openingStock = prevClosing;
      } else if (!prevShift) {
        // Shift đầu tiên - lấy từ Tank
        const tankResult = await manager
          .createQueryBuilder()
          .select('SUM(t.current_stock)', 'totalStock')
          .from('tanks', 't')
          .where('t.product_id = :productId', { productId: product.id })
          .andWhere('t.store_id = :storeId', { storeId: shift.storeId })
          .getRawOne();

        openingStock = Number(tankResult?.totalStock) || 0;
      }

      if (openingStock !== 0) {
        openingStockData.push({
          productId: product.id,
          productCode: product.code,
          productName: product.name,
          openingStock: Number(openingStock),
        });
      }
    }

    shift.openingStockJson = openingStockData.length > 0 ? openingStockData : null;

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
          })
          .where('ref_type = :refType', { refType: 'DEBT_SALE' })
          .andWhere('ref_id IN (:...refIds)', { refIds: debtSaleIds })
          .execute();
      }

      // Note: pump_readings và sales không có field supersededByShiftId
      // Dữ liệu sẽ được xử lý khi chốt ca lại

      console.log(
        `🔄 Marked all data from shift ${shiftId} as SUPERSEDED (kept for audit)`,
      );

      // Mở lại ca (KHÔNG tạo ca mới, dùng luôn ca cũ)
      // Giữ lại closedAt để frontend biết đây là ca đã từng chốt (cho phép hiển thị nút Sửa)
      shift.status = 'OPEN';
      // shift.closedAt = null; // Không xóa closedAt

      // ✅ Clear opening_stock_json của shift này và tất cả shift sau
      shift.openingStockJson = null;

      // Clear opening_stock_json của tất cả shift sau shift này (vì chúng phụ thuộc vào shift này)
      await manager
        .createQueryBuilder()
        .update(Shift)
        .set({ openingStockJson: null })
        .where('store_id = :storeId', { storeId: shift.storeId })
        .andWhere(
          '(shift_date > :shiftDate OR (shift_date = :shiftDate AND shift_no > :shiftNo))',
          {
            shiftDate: shift.shiftDate,
            shiftNo: shift.shiftNo,
          },
        )
        .execute();

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

  /**
   * Cho phép sửa ca - Admin bật chế độ sửa để user cửa hàng có thể sửa ca đã chốt
   * CHỈ đổi status từ CLOSED → OPEN, KHÔNG xóa hay thay đổi dữ liệu gì
   */
  async enableEdit(shiftId: number, user: any): Promise<Shift> {
    const shift = await this.shiftRepository.findOne({
      where: { id: shiftId },
      relations: ['store'],
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    if (shift.status !== 'CLOSED') {
      throw new BadRequestException('Chỉ có thể mở chế độ sửa cho ca đã chốt');
    }

    // Check nếu đã có payment cho debt sales từ ca này
    const debtSales = await this.dataSource.manager.find(ShiftDebtSale, {
      where: { shiftId },
      relations: ['customer'],
    });

    for (const debtSale of debtSales) {
      const debtSaleEntry = await this.dataSource.manager.findOne(DebtLedger, {
        where: {
          customerId: debtSale.customerId,
          refType: 'DEBT_SALE',
          refId: debtSale.id,
        },
      });

      if (debtSaleEntry) {
        const paymentsAfterSale = await this.dataSource.manager
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
            `❌ KHÔNG THỂ MỞ CHẾ ĐỘ SỬA!\n` +
              `Khách hàng "${debtSale.customer?.name}" đã thanh toán công nợ từ ca này.\n` +
              `Nếu sửa số tiền bán sẽ gây lỗi số dư công nợ.`,
          );
        }
      }
    }

    const oldStatus = shift.status;
    shift.status = 'OPEN';
    // Giữ nguyên closedAt để frontend biết đây là ca đã từng chốt

    const updatedShift = await this.shiftRepository.save(shift);

    // Ghi audit log
    await this.auditLogRepository.save({
      tableName: 'shifts',
      recordId: shift.id,
      action: 'ENABLE_EDIT',
      oldData: { status: oldStatus },
      newData: { status: 'OPEN', note: 'Cho phép sửa ca - giữ nguyên dữ liệu' },
      changedBy: user?.id,
    });

    console.log(`✏️ Shift ${shiftId} edit enabled by user ${user?.id}`);
    return updatedShift;
  }

  /**
   * Cập nhật thông tin mở ca (shiftDate, shiftNo, openedAt, handoverName, receiverName)
   * Chỉ cho phép khi ca đang mở và chưa chốt lần nào
   */
  async updateOpeningInfo(shiftId: number, dto: UpdateOpeningInfoDto, user: any): Promise<Shift> {
    const shift = await this.shiftRepository.findOne({
      where: { id: shiftId },
      relations: ['store'],
    });

    if (!shift) {
      throw new NotFoundException('Không tìm thấy ca làm việc');
    }

    if (shift.status !== 'OPEN') {
      throw new BadRequestException('Chỉ có thể sửa thông tin mở ca khi ca đang mở');
    }

    // Chỉ cho phép sửa nếu ca chưa từng chốt (closedAt = null)
    if (shift.closedAt) {
      throw new BadRequestException('Không thể sửa thông tin mở ca sau khi ca đã chốt. Vui lòng sử dụng chức năng Sửa ca.');
    }

    const oldData = {
      shiftDate: shift.shiftDate,
      shiftNo: shift.shiftNo,
      openedAt: shift.openedAt,
      handoverName: shift.handoverName,
      receiverName: shift.receiverName,
    };

    // Kiểm tra nếu đổi ngày hoặc số ca, đảm bảo không trùng
    if (dto.shiftDate || dto.shiftNo) {
      const targetDate = dto.shiftDate ? new Date(dto.shiftDate) : shift.shiftDate;
      const targetNo = dto.shiftNo ?? shift.shiftNo;

      const existingShift = await this.shiftRepository.findOne({
        where: {
          storeId: shift.storeId,
          shiftDate: targetDate,
          shiftNo: targetNo,
        },
      });

      if (existingShift && existingShift.id !== shiftId) {
        throw new BadRequestException(
          `Ca ${targetNo} ngày ${dto.shiftDate || shift.shiftDate.toISOString().split('T')[0]} đã tồn tại.`,
        );
      }
    }

    // Cập nhật các trường
    if (dto.shiftDate) {
      shift.shiftDate = new Date(dto.shiftDate);
    }
    if (dto.shiftNo !== undefined) {
      shift.shiftNo = dto.shiftNo;
    }
    if (dto.openedAt) {
      shift.openedAt = new Date(dto.openedAt);
    }
    if (dto.handoverName !== undefined) {
      shift.handoverName = dto.handoverName || null;
    }
    if (dto.receiverName !== undefined) {
      shift.receiverName = dto.receiverName || null;
    }

    const updatedShift = await this.shiftRepository.save(shift);

    // Ghi audit log
    await this.auditLogRepository.save({
      tableName: 'shifts',
      recordId: shift.id,
      action: 'UPDATE_OPENING_INFO',
      oldData,
      newData: {
        shiftDate: shift.shiftDate,
        shiftNo: shift.shiftNo,
        openedAt: shift.openedAt,
        handoverName: shift.handoverName,
        receiverName: shift.receiverName,
      },
      changedBy: user?.id,
    });

    console.log(`📝 Shift ${shiftId} opening info updated by user ${user?.id}`);
    return updatedShift;
  }

  /**
   * Cập nhật thời gian mở ca và đóng ca (chỉ dành cho Admin)
   */
  async updateShiftTimes(shiftId: number, dto: UpdateShiftTimesDto, user: any): Promise<Shift> {
    const shift = await this.shiftRepository.findOne({
      where: { id: shiftId },
      relations: ['store'],
    });

    if (!shift) {
      throw new NotFoundException('Không tìm thấy ca làm việc');
    }

    const oldData = {
      openedAt: shift.openedAt,
      closedAt: shift.closedAt,
    };

    const openedAt = new Date(dto.openedAt);
    const closedAt = new Date(dto.closedAt);

    // Kiểm tra closedAt phải sau openedAt
    if (closedAt <= openedAt) {
      throw new BadRequestException('Thời gian đóng ca phải sau thời gian mở ca');
    }

    shift.openedAt = openedAt;
    shift.closedAt = closedAt;

    const updatedShift = await this.shiftRepository.save(shift);

    // ⏰ CÂP NHẬT ledgerAt cho các bản ghi cash_ledger thiếu
    // Giúp fix lỗi dòng bị thiếu trong báo cáo sổ quỹ

    // 1. Update DEPOSIT: lấy từ deposit_at (nếu có)
    await this.dataSource.query(`
      UPDATE cash_ledger cl
      INNER JOIN cash_deposits cd ON cl.ref_id = cd.id
      SET cl.ledger_at = cd.deposit_at
      WHERE cl.shift_id = ?
        AND cl.ref_type = 'DEPOSIT'
        AND cl.ledger_at IS NULL
        AND cd.deposit_at IS NOT NULL
    `, [shiftId]);

    // 2. Update RECEIPT: lấy từ receipt_at (nếu có)
    await this.dataSource.query(`
      UPDATE cash_ledger cl
      INNER JOIN receipts r ON cl.ref_id = r.id
      SET cl.ledger_at = r.receipt_at
      WHERE cl.shift_id = ?
        AND cl.ref_type = 'RECEIPT'
        AND cl.ledger_at IS NULL
        AND r.receipt_at IS NOT NULL
    `, [shiftId]);

    // 3. Fallback: TẤT CẢ bản ghi còn thiếu → dùng closedAt của ca
    await this.cashLedgerRepository
      .createQueryBuilder()
      .update(CashLedger)
      .set({ ledgerAt: closedAt })
      .where('shift_id = :shiftId', { shiftId })
      .andWhere('ledger_at IS NULL')
      .execute();

    console.log(`⏰ Updated ledger_at for shift ${shiftId} cash ledgers`);

    // Ghi audit log
    await this.auditLogRepository.save({
      tableName: 'shifts',
      recordId: shift.id,
      action: 'UPDATE_SHIFT_TIMES',
      oldData,
      newData: {
        openedAt: shift.openedAt,
        closedAt: shift.closedAt,
      },
      changedBy: user?.id,
    });

    console.log(`⏰ Shift ${shiftId} times updated by admin user ${user?.id}`);
    return updatedShift;
  }

  /**
   * Khóa ca - Admin đóng lại ca mà giữ nguyên dữ liệu (chỉ đổi status về CLOSED)
   */
  async lockShift(shiftId: number, user: any): Promise<Shift> {
    const shift = await this.shiftRepository.findOne({
      where: { id: shiftId },
      relations: ['store'],
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    if (shift.status !== 'OPEN') {
      throw new BadRequestException('Chỉ có thể khóa ca đang mở');
    }

    const oldStatus = shift.status;
    shift.status = 'CLOSED';

    const lockedShift = await this.shiftRepository.save(shift);

    // Ghi audit log
    await this.auditLogRepository.save({
      tableName: 'shifts',
      recordId: shift.id,
      action: 'LOCK',
      oldData: { status: oldStatus },
      newData: { status: 'CLOSED' },
      changedBy: user?.id,
    });

    console.log(`🔒 Shift ${shiftId} locked by user ${user?.id}`);
    return lockedShift;
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

    // ✅ Sử dụng thời điểm mở ca để lấy giá đúng kỳ giá
    const priceReferenceTime = shift.openedAt || new Date();

    // Tính tổng doanh thu từ vòi bơm (hoặc sales nếu đã chốt ca)
    let totalFromPumps = 0;

    if (shift.pumpReadings && shift.pumpReadings.length > 0) {
      // Nếu có pump readings, tính từ đó
      for (const reading of shift.pumpReadings) {
        // ✅ Lấy giá tại thời điểm MỞ CA thay vì thời điểm hiện tại
        const price = await this.productPriceRepository
          .createQueryBuilder('pp')
          .where('pp.product_id = :productId', { productId: reading.productId })
          .andWhere('pp.region_id = :regionId', {
            regionId: shift.store.regionId,
          })
          .andWhere('pp.valid_from <= :priceReferenceTime', { priceReferenceTime })
          .andWhere('(pp.valid_to IS NULL OR pp.valid_to > :priceReferenceTime)', {
            priceReferenceTime,
          })
          .getOne();

        if (price) {
          totalFromPumps += Math.round(reading.quantity * Number(price.price)); // Làm tròn để tránh số lẻ thập phân
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

  async findByStore(storeId: number, limit = 100) {
    return this.shiftRepository.find({
      where: { storeId },
      order: { shiftDate: 'DESC', shiftNo: 'DESC' },
      take: limit,
      relations: ['store'],
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
      // Ưu tiên sử dụng amount từ frontend (tránh sai số làm tròn)
      // Fallback tính lại nếu frontend không gửi amount
      const amount = createDto.amount ?? Math.round(createDto.quantity * createDto.unitPrice);
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
        ledgerAt: createDto.depositAt ? new Date(createDto.depositAt) : new Date(), // ⏰ Lấy thời gian nộp tiền user chọn
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

  // ==================== CHECKPOINT (KIỂM KÊ GIỮA CA) ====================

  /**
   * Tạo checkpoint (kiểm kê) trong ca đang mở
   * Ghi nhận số đồng hồ vòi bơm và tồn kho thực tế tại thời điểm kiểm kê
   */
  async createCheckpoint(
    shiftId: number,
    dto: CreateCheckpointDto,
    userId: number,
  ) {
    const shift = await this.shiftRepository.findOne({
      where: { id: shiftId },
      relations: ['store'],
    });

    if (!shift) {
      throw new NotFoundException('Không tìm thấy ca làm việc');
    }

    if (shift.status !== 'OPEN') {
      throw new BadRequestException('Chỉ có thể kiểm kê khi ca đang mở');
    }

    // Tính checkpoint_no tiếp theo
    const lastCheckpoint = await this.dataSource.getRepository(ShiftCheckpoint).findOne({
      where: { shiftId },
      order: { checkpointNo: 'DESC' },
    });
    const nextCheckpointNo = (lastCheckpoint?.checkpointNo || 0) + 1;

    // Tạo checkpoint
    const checkpointRepo = this.dataSource.getRepository(ShiftCheckpoint);
    const readingRepo = this.dataSource.getRepository(ShiftCheckpointReading);
    const stockRepo = this.dataSource.getRepository(ShiftCheckpointStock);

    return await this.dataSource.transaction(async (manager) => {
      // 1. Tạo checkpoint
      const checkpoint = checkpointRepo.create({
        shiftId,
        checkpointNo: nextCheckpointNo,
        checkpointAt: new Date(dto.checkpointAt),
        notes: dto.notes,
        createdBy: userId,
      });
      const savedCheckpoint = await manager.save(checkpoint);

      // 2. Lưu số đồng hồ vòi bơm
      if (dto.readings && dto.readings.length > 0) {
        const readings = dto.readings.map((r) =>
          readingRepo.create({
            checkpointId: savedCheckpoint.id,
            pumpId: r.pumpId,
            pumpCode: r.pumpCode,
            productId: r.productId,
            meterValue: r.meterValue,
          }),
        );
        await manager.save(readings);
      }

      // 3. Lưu tồn kho thực tế các bể
      if (dto.stocks && dto.stocks.length > 0) {
        const stocks = dto.stocks.map((s) =>
          stockRepo.create({
            checkpointId: savedCheckpoint.id,
            tankId: s.tankId,
            productId: s.productId,
            systemQuantity: s.systemQuantity,
            actualQuantity: s.actualQuantity,
            notes: s.notes,
          }),
        );
        await manager.save(stocks);
      }

      // 4. Ghi audit log
      const auditLog = this.auditLogRepository.create({
        tableName: 'shift_checkpoints',
        recordId: savedCheckpoint.id,
        action: 'CREATE',
        changedBy: userId,
        newData: {
          shiftId,
          checkpointNo: nextCheckpointNo,
          checkpointAt: dto.checkpointAt,
          readingsCount: dto.readings?.length || 0,
          stocksCount: dto.stocks?.length || 0,
        },
      });
      await manager.save(auditLog);

      return savedCheckpoint;
    });
  }

  /**
   * Lấy danh sách checkpoint của một ca
   */
  async getCheckpoints(shiftId: number) {
    const checkpointRepo = this.dataSource.getRepository(ShiftCheckpoint);
    return await checkpointRepo.find({
      where: { shiftId },
      relations: ['readings', 'readings.pump', 'readings.product', 'stocks', 'stocks.tank', 'stocks.product', 'creator'],
      order: { checkpointNo: 'ASC' },
    });
  }

  /**
   * Xóa checkpoint (chỉ được xóa checkpoint cuối cùng của ca đang mở)
   */
  async deleteCheckpoint(shiftId: number, checkpointId: number, userId: number) {
    const shift = await this.shiftRepository.findOne({ where: { id: shiftId } });

    if (!shift) {
      throw new NotFoundException('Không tìm thấy ca làm việc');
    }

    if (shift.status !== 'OPEN') {
      throw new BadRequestException('Chỉ có thể xóa kiểm kê khi ca đang mở');
    }

    const checkpointRepo = this.dataSource.getRepository(ShiftCheckpoint);
    const checkpoint = await checkpointRepo.findOne({
      where: { id: checkpointId, shiftId },
    });

    if (!checkpoint) {
      throw new NotFoundException('Không tìm thấy phiếu kiểm kê');
    }

    // Kiểm tra xem có phải checkpoint cuối không
    const lastCheckpoint = await checkpointRepo.findOne({
      where: { shiftId },
      order: { checkpointNo: 'DESC' },
    });

    if (lastCheckpoint?.id !== checkpointId) {
      throw new BadRequestException('Chỉ có thể xóa phiếu kiểm kê cuối cùng');
    }

    // Xóa checkpoint (cascade sẽ xóa readings và stocks)
    await checkpointRepo.delete(checkpointId);

    // Ghi audit log
    const auditLog = this.auditLogRepository.create({
      tableName: 'shift_checkpoints',
      recordId: checkpointId,
      action: 'DELETE',
      changedBy: userId,
      oldData: {
        shiftId,
        checkpointNo: checkpoint.checkpointNo,
        checkpointAt: checkpoint.checkpointAt,
      },
    });
    await this.auditLogRepository.save(auditLog);

    return { success: true };
  }
}
