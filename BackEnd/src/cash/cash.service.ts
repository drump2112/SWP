import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CashLedger } from '../entities/cash-ledger.entity';

@Injectable()
export class CashService {
  constructor(
    @InjectRepository(CashLedger)
    private cashLedgerRepository: Repository<CashLedger>,
  ) {}

  async getCashBalance(storeId: number) {
    const result = await this.cashLedgerRepository
      .createQueryBuilder('cl')
      .select('SUM(cl.cash_in - cl.cash_out)', 'balance')
      .where('cl.store_id = :storeId', { storeId })
      // TODO: Thêm .andWhere('cl.superseded_by_shift_id IS NULL') sau khi chạy migration
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
    });

    return this.cashLedgerRepository.save(cashLedger);
  }
}
