import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Shift } from '../entities/shift.entity';
import { PumpReading } from '../entities/pump-reading.entity';
import { Sale } from '../entities/sale.entity';
import { InventoryLedger } from '../entities/inventory-ledger.entity';
import { ProductPrice } from '../entities/product-price.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { ShiftDebtSale } from '../entities/shift-debt-sale.entity';
import { CashDeposit } from '../entities/cash-deposit.entity';
import { DebtLedger } from '../entities/debt-ledger.entity';
import { CashLedger } from '../entities/cash-ledger.entity';
import { Receipt } from '../entities/receipt.entity';
import { ReceiptDetail } from '../entities/receipt-detail.entity';
import { CreateShiftDto } from './dto/create-shift.dto';
import { CloseShiftDto } from './dto/close-shift.dto';
import { CreateShiftDebtSaleDto, CreateCashDepositDto, CreateReceiptDto } from './dto/shift-operations.dto';

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
    private dataSource: DataSource,
  ) {}

  async create(createShiftDto: CreateShiftDto): Promise<Shift> {
    // Kiểm tra ca đã tồn tại chưa
    const existingShift = await this.shiftRepository.findOne({
      where: {
        storeId: createShiftDto.storeId,
        shiftDate: createShiftDto.shiftDate,
        shiftNo: createShiftDto.shiftNo,
      },
    });

    if (existingShift) {
      throw new BadRequestException(
        `Ca ${createShiftDto.shiftNo} ngày ${createShiftDto.shiftDate} đã tồn tại. ` +
        `Vui lòng chọn số ca khác hoặc vào ca đã có để chốt ca.`
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

  async closeShift(closeShiftDto: CloseShiftDto, user: any): Promise<Shift> {
    console.log('📥 closeShift called with DTO:', JSON.stringify(closeShiftDto, null, 2));

    return await this.dataSource.transaction(async (manager) => {
      const shift = await manager.findOne(Shift, {
        where: { id: closeShiftDto.shiftId },
        relations: ['store', 'store.region'],
      });

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
        throw new BadRequestException('Shift already has pump readings. Cannot close again.');
      }

      // Lưu trạng thái cũ để ghi audit log
      const oldData = { ...shift };

      // 1. Lưu số liệu cột bơm (bulk insert)
      const pumpReadingsData = closeShiftDto.pumpReadings.map(reading => {
        const quantity = reading.endValue - reading.startValue;
        return {
          shiftId: shift.id,
          pumpCode: reading.pumpCode,
          productId: reading.productId,
          startValue: reading.startValue,
          endValue: reading.endValue,
          quantity,
        };
      });

      await manager
        .createQueryBuilder()
        .insert()
        .into(PumpReading)
        .values(pumpReadingsData)
        .execute();

      // 2. Lấy giá sản phẩm (1 query thay vì N queries)
      const productIds = [...new Set(closeShiftDto.pumpReadings.map(r => r.productId))];
      const prices = await manager
        .createQueryBuilder(ProductPrice, 'pp')
        .where('pp.product_id IN (:...productIds)', { productIds })
        .andWhere('pp.region_id = :regionId', { regionId: shift.store.regionId })
        .andWhere('pp.valid_from <= :now', { now: new Date() })
        .andWhere('(pp.valid_to IS NULL OR pp.valid_to > :now)', { now: new Date() })
        .getMany();

      const priceMap = new Map(prices.map(p => [p.productId, Number(p.price)]));

      // Validate: Tất cả sản phẩm phải có giá
      const missingPrices = pumpReadingsData.filter(r => !priceMap.has(r.productId));
      if (missingPrices.length > 0) {
        const productIdsStr = missingPrices.map(r => r.productId).join(', ');
        throw new BadRequestException(`Không tìm thấy giá cho sản phẩm: ${productIdsStr}. Vui lòng cập nhật bảng giá.`);
      }

      // 3. Tạo sales từ pump readings (bulk insert)
      const salesData = pumpReadingsData.map(reading => {
        const unitPrice = priceMap.get(reading.productId)!; // Safe after validation
        return {
          shiftId: shift.id,
          storeId: shift.storeId,
          productId: reading.productId,
          quantity: reading.quantity,
          unitPrice,
          amount: reading.quantity * unitPrice,
          customerId: undefined, // Bán lẻ
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

      // 4. Cập nhật tồn kho BỂ CHỨA (tanks) thay vì warehouse
      // Lấy thông tin pumps để biết tank_id
      const pumpCodes = closeShiftDto.pumpReadings.map(r => r.pumpCode);
      const pumps = await manager
        .createQueryBuilder('pumps', 'p')
        .where('p.pump_code IN (:...pumpCodes)', { pumpCodes })
        .andWhere('p.store_id = :storeId', { storeId: shift.storeId })
        .getMany();

      const pumpMap = new Map(pumps.map(p => [p.pumpCode, p]));

      // Cập nhật currentStock cho từng tank
      for (const reading of pumpReadingsData) {
        const pump = pumpMap.get(reading.pumpCode);
        if (pump && pump.tankId) {
          // Giảm tồn kho bể
          await manager
            .createQueryBuilder()
            .update('tanks')
            .set({
              currentStock: () => `current_stock - ${reading.quantity}`,
            })
            .where('id = :tankId', { tankId: pump.tankId })
            .execute();

          console.log(`📉 Tank ${pump.tankId}: Giảm ${reading.quantity} lít`);
        } else {
          console.warn(`⚠️ Pump ${reading.pumpCode} không có tankId, bỏ qua cập nhật tồn kho`);
        }
      }

      // 5. ⚠️ GHI SỔ QUỸ: Thu tiền bán lẻ
      // NOTE: Logic hiện tại giả định TOÀN BỘ bán lẻ là tiền mặt
      // Trong thực tế, cần phân biệt: tiền mặt / thẻ / ví điện tử
      // TODO: Thêm payment_method cho mỗi sale hoặc thêm field cash_amount vào CloseShiftDto
      const totalRetailAmount = salesData.reduce((sum, s) => sum + Number(s.amount), 0);

      if (totalRetailAmount > 0) {
        await manager.save(CashLedger, {
          storeId: shift.storeId,
          refType: 'SHIFT_CLOSE',
          refId: shift.id,
          cashIn: totalRetailAmount,
          cashOut: 0,
          notes: 'Thu tiền bán lẻ (giả định toàn bộ là tiền mặt)',
        });
      }

      // 6. Xử lý DRAFT DATA: Debt Sales, Receipts, Deposits
      // 6.1. Xử lý Debt Sales (bán công nợ)
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

          // Ghi công nợ (debit customer)
          await manager.save(DebtLedger, {
            customerId: debtSale.customerId,
            storeId: shift.storeId,
            refType: 'DEBT_SALE',
            refId: debtSaleRecord.id,
            debit: totalAmount,
            credit: 0,
            notes: debtSale.notes || 'Bán công nợ',
          });

          // NOTE: Bán công nợ KHÔNG giảm tồn kho bể
          // Vì đã tính trong pump readings rồi
          // (công nợ chỉ là phân loại doanh thu, không phải xuất kho riêng)

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
            notes: receipt.notes,
          });

          // Lưu chi tiết
          for (const detail of receipt.details) {
            await manager.save(ReceiptDetail, {
              receiptId: receiptRecord.id,
              customerId: detail.customerId,
              amount: detail.amount,
            });

            // Ghi công nợ (credit customer - giảm nợ)
            await manager.save(DebtLedger, {
              customerId: detail.customerId,
              storeId: receipt.storeId,
              refType: 'RECEIPT',
              refId: receiptRecord.id,
              debit: 0,
              credit: detail.amount,
              notes: receipt.notes || 'Thanh toán nợ',
            });
          }

          // Ghi sổ quỹ (thu tiền mặt)
          await manager.save(CashLedger, {
            storeId: receipt.storeId,
            refType: 'RECEIPT',
            refId: receiptRecord.id,
            cashIn: receipt.amount,
            cashOut: 0,
            notes: receipt.notes || 'Thu tiền thanh toán nợ',
          });
        }
      }

      // 6.3. Xử lý Deposits (nộp tiền về công ty)
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
            notes: deposit.notes,
          });

          // Ghi sổ quỹ (chi tiền mặt)
          await manager.save(CashLedger, {
            storeId: deposit.storeId,
            refType: 'DEPOSIT',
            refId: depositRecord.id,
            cashIn: 0,
            cashOut: deposit.amount,
            notes: deposit.notes || 'Nộp tiền về công ty',
          });
        }
      }

      // 7. Đóng ca
      shift.closedAt = new Date();
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
    });
  }

  async reopenShift(shiftId: number, user: any): Promise<Shift> {
    const shift = await this.shiftRepository.findOne({
      where: { id: shiftId },
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    if (shift.status !== 'CLOSED') {
      throw new BadRequestException('Shift is not closed');
    }

    const oldData = { ...shift };

    // Mở lại ca
    shift.status = 'ADJUSTED';
    shift.closedAt = null;
    const updatedShift = await this.shiftRepository.save(shift);

    // Ghi audit log
    await this.auditLogRepository.save({
      tableName: 'shifts',
      recordId: shift.id,
      action: 'REOPEN',
      oldData: { status: oldData.status, closedAt: oldData.closedAt },
      newData: { status: 'ADJUSTED', closedAt: null },
      changedBy: user?.id,
    });

    return updatedShift;
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
      relations: ['pumpReadings', 'pumpReadings.product', 'sales', 'sales.product', 'store'],
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
          .andWhere('pp.region_id = :regionId', { regionId: shift.store.regionId })
          .andWhere('pp.valid_from <= :now', { now: new Date() })
          .andWhere('(pp.valid_to IS NULL OR pp.valid_to > :now)', { now: new Date() })
          .getOne();

        if (price) {
          totalFromPumps += reading.quantity * Number(price.price);
        }
      }
    } else if (shift.sales && shift.sales.length > 0) {
      // Nếu chưa có pump readings nhưng đã có sales (ca đã chốt)
      totalFromPumps = shift.sales.reduce((sum, sale) => sum + Number(sale.amount), 0);
    }

    // Lấy doanh số bán công nợ
    const debtSales = await this.getShiftDebtSales(shiftId);
    const totalDebtSales = debtSales.reduce((sum, sale) => sum + Number(sale.amount), 0);

    // Bán lẻ = Tổng từ vòi bơm - Công nợ
    const totalRetailSales = totalFromPumps - totalDebtSales;

    // Lấy phiếu thu tiền (receipts - thanh toán nợ)
    const receipts = await this.getShiftReceipts(shiftId);
    const totalReceipts = receipts.reduce((sum, receipt) => sum + Number(receipt.amount), 0);

    // Lấy phiếu nộp tiền
    const cashDeposits = await this.getShiftCashDeposits(shiftId);
    const totalDeposits = cashDeposits.reduce((sum, deposit) => sum + Number(deposit.amount), 0);

    // Tính số dư quỹ thực tế từ cash_ledger
    const cashLedgerBalance = await this.cashLedgerRepository
      .createQueryBuilder('cl')
      .select('COALESCE(SUM(cl.cash_in - cl.cash_out), 0)', 'balance')
      .where('cl.store_id = :storeId', { storeId: shift.storeId })
      .getRawOne();
    const actualCashBalance = Number(cashLedgerBalance?.balance || 0);

    // Biến động tiền mặt trong ca này
    const cashMovementInShift = totalRetailSales + totalReceipts - totalDeposits;

    return {
      shift,
      summary: {
        totalRetailSales,   // Bán lẻ = Tổng vòi bơm - Công nợ
        totalDebtSales,     // Bán công nợ
        totalRevenue: totalFromPumps, // Tổng doanh thu = Tổng từ vòi bơm
        totalReceipts,      // Thu tiền (thanh toán nợ)
        totalDeposits,      // Nộp về công ty
        cashMovement: cashMovementInShift, // Biến động tiền mặt trong ca
        actualCashBalance,  // Số dư quỹ thực tế (từ cash_ledger)
        // Legacy field for backward compatibility
        cashBalance: cashMovementInShift,
      },
      pumpReadings: shift.pumpReadings,
      retailSales: shift.sales.filter(sale => !sale.customerId),
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
      relations: ['shift']
    });

    if (!debtSale) {
      throw new NotFoundException('Debt sale not found');
    }

    // Kiểm tra ca đã đóng chưa
    if (debtSale.shift?.status !== 'OPEN') {
      throw new BadRequestException('Cannot delete debt sale from closed or adjusted shift');
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

      const totalDetailAmount = createDto.details.reduce((sum, d) => sum + d.amount, 0);
      if (Math.abs(totalDetailAmount - createDto.amount) > 0.01) {
        throw new BadRequestException('Total detail amount must equal receipt amount');
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
          receiptId: savedReceipt.id,
          customerId: detail.customerId,
          amount: detail.amount,
        });
        await manager.save(receiptDetail);

        // 3. Ghi giảm nợ cho khách
        await manager.save(DebtLedger, {
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
    return this.receiptRepository.find({
      where: { shiftId },
      relations: ['receiptDetails', 'receiptDetails.customer'],
      order: { createdAt: 'ASC' },
    });
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
        }
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
    previousReadings.forEach(reading => {
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
