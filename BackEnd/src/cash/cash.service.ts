import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CashLedger } from '../entities/cash-ledger.entity';
import { Store } from '../entities/store.entity';
import { OpeningBalanceCashDto } from './dto/opening-balance-cash.dto';

@Injectable()
export class CashService {
  constructor(
    @InjectRepository(CashLedger)
    private cashLedgerRepository: Repository<CashLedger>,
    @InjectRepository(Store)
    private storeRepository: Repository<Store>,
  ) {}

  async getCashBalance(storeId: number) {
    const result = await this.cashLedgerRepository
      .createQueryBuilder('cl')
      .select('SUM(cl.cash_in - cl.cash_out)', 'balance')
      .where('cl.store_id = :storeId', { storeId })
      .getRawOne();

    return {
      storeId,
      balance: Number(result?.balance || 0),
    };
  }

  async getCashLedger(storeId: number, limit = 50) {
    const ledgers = await this.cashLedgerRepository.find({
      where: { storeId },
      order: { createdAt: 'DESC' },
      take: limit,
    });

    let balance = 0;
    const statement = ledgers.reverse().map((ledger) => {
      balance += Number(ledger.cashIn) - Number(ledger.cashOut);
      return {
        ...ledger,
        balance,
      };
    });

    return {
      storeId,
      ledgers: statement.reverse(),
      currentBalance: balance,
    };
  }

  async createDeposit(storeId: number, amount: number) {
    // Nộp tiền về công ty (tiền ra khỏi quỹ)
    const cashLedger = this.cashLedgerRepository.create({
      storeId,
      refType: 'DEPOSIT',
      refId: undefined,
      cashIn: 0,
      cashOut: amount,
      ledgerAt: new Date(), // ⏰ Ghi nhận thời gian nộp tiền
    });

    return this.cashLedgerRepository.save(cashLedger);
  }

  /**
   * Nhập số dư đầu kỳ cho sổ quỹ tiền mặt
   * Tương tự như nhập tồn đầu kho
   */
  async setOpeningBalance(dto: OpeningBalanceCashDto) {
    const { storeId, openingBalance, effectiveDate, notes } = dto;

    // 1. Lấy số dư hiện tại (KHÔNG bao gồm OPENING_BALANCE)
    const result = await this.cashLedgerRepository
      .createQueryBuilder('cl')
      .select('SUM(cl.cash_in - cl.cash_out)', 'balance')
      .where('cl.store_id = :storeId', { storeId })
      .andWhere('cl.ref_type != :refType', { refType: 'OPENING_BALANCE' })
      .getRawOne();

    const currentBalance = Number(result?.balance || 0);

    // 2. Tính chênh lệch
    const adjustment = openingBalance - currentBalance;

    if (adjustment === 0) {
      return {
        success: true,
        message: 'Số dư đã đúng, không cần điều chỉnh',
        data: {
          storeId,
          currentBalance,
          targetBalance: openingBalance,
          adjustment: 0,
        },
      };
    }

    // 3. Kiểm tra xem đã có OPENING_BALANCE trong ngày này chưa (dựa trên ledgerAt)
    const effectiveDateValue = effectiveDate ? new Date(effectiveDate) : new Date();
    const startOfDay = new Date(effectiveDateValue);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(effectiveDateValue);
    endOfDay.setHours(23, 59, 59, 999);

    const existingOpening = await this.cashLedgerRepository.findOne({
      where: {
        storeId,
        refType: 'OPENING_BALANCE',
      },
      order: { ledgerAt: 'DESC' }, // ⏰ Sắp xếp theo ledgerAt thay vì createdAt
    });

    if (existingOpening && existingOpening.ledgerAt) {
      const existingDate = new Date(existingOpening.ledgerAt);
      if (existingDate >= startOfDay && existingDate <= endOfDay) {
        throw new BadRequestException(
          `Đã có số dư đầu kỳ cho ngày ${effectiveDateValue.toLocaleDateString('vi-VN')}. Vui lòng xóa hoặc chọn ngày khác.`,
        );
      }
    }

    // 4. Tạo bút toán điều chỉnh
    const cashLedger = this.cashLedgerRepository.create({
      storeId,
      refType: 'OPENING_BALANCE',
      refId: undefined,
      cashIn: adjustment > 0 ? adjustment : 0,
      cashOut: adjustment < 0 ? Math.abs(adjustment) : 0,
      ledgerAt: effectiveDateValue, // ⏰ Dùng ledgerAt để báo cáo lọc đúng
    });

    const savedLedger = await this.cashLedgerRepository.save(cashLedger);

    return {
      success: true,
      message: adjustment > 0 ? 'Đã tăng số dư quỹ' : 'Đã giảm số dư quỹ',
      data: {
        storeId,
        previousBalance: currentBalance,
        targetBalance: openingBalance,
        adjustment,
        cashLedgerId: savedLedger.id,
        effectiveDate: effectiveDateValue,
        notes,
      },
    };
  }

  /**
   * Lấy danh sách các bản ghi số dư đầu kỳ
   */
  async getOpeningBalanceRecords(storeId?: number) {
    const queryBuilder = this.cashLedgerRepository
      .createQueryBuilder('cl')
      .leftJoinAndSelect('cl.store', 'store')
      .where('cl.refType = :refType', { refType: 'OPENING_BALANCE' });

    if (storeId) {
      queryBuilder.andWhere('cl.storeId = :storeId', { storeId });
    }

    queryBuilder.orderBy('cl.createdAt', 'DESC');

    const records = await queryBuilder.getMany();

    return records.map(record => ({
      id: record.id,
      storeId: record.storeId,
      storeName: record.store?.name,
      cashIn: Number(record.cashIn),
      cashOut: Number(record.cashOut),
      netAmount: Number(record.cashIn) - Number(record.cashOut),
      effectiveDate: record.createdAt,
      createdAt: record.createdAt,
    }));
  }

  /**
   * Cập nhật số dư đầu kỳ
   */
  async updateOpeningBalance(id: number, newOpeningBalance: number, notes?: string, effectiveDate?: string) {
    // 1. Tìm record cũ
    const oldRecord = await this.cashLedgerRepository.findOne({
      where: { id, refType: 'OPENING_BALANCE' },
    });

    if (!oldRecord) {
      throw new BadRequestException('Không tìm thấy bản ghi số dư đầu kỳ');
    }

    // 2. Tính số dư đầu kỳ cũ
    const oldOpeningBalance = Number(oldRecord.cashIn) - Number(oldRecord.cashOut);

    // 3. Kiểm tra có thay đổi không
    if (oldOpeningBalance === newOpeningBalance && !effectiveDate) {
      return {
        success: true,
        message: 'Số dư không thay đổi',
      };
    }

    // 4. Cập nhật record - THAY THẾ giá trị mới hoàn toàn
    if (newOpeningBalance >= 0) {
      oldRecord.cashIn = newOpeningBalance;
      oldRecord.cashOut = 0;
    } else {
      oldRecord.cashIn = 0;
      oldRecord.cashOut = Math.abs(newOpeningBalance);
    }

    // Cập nhật ngày hiệu lực nếu có (dùng ledgerAt thay vì createdAt)
    if (effectiveDate) {
      oldRecord.ledgerAt = new Date(effectiveDate);
    }

    await this.cashLedgerRepository.save(oldRecord);

    return {
      success: true,
      message: 'Cập nhật số dư đầu kỳ thành công',
      data: {
        id,
        oldOpeningBalance,
        newOpeningBalance,
        adjustment: newOpeningBalance - oldOpeningBalance,
      },
    };
  }
}
