import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Receipt } from '../entities/receipt.entity';
import { ReceiptDetail } from '../entities/receipt-detail.entity';
import { DebtLedger } from '../entities/debt-ledger.entity';
import { CashLedger } from '../entities/cash-ledger.entity';
import { CreateReceiptDto } from './dto/create-receipt.dto';

@Injectable()
export class ReceiptsService {
  constructor(
    @InjectRepository(Receipt)
    private receiptRepository: Repository<Receipt>,
    @InjectRepository(ReceiptDetail)
    private receiptDetailRepository: Repository<ReceiptDetail>,
    @InjectRepository(DebtLedger)
    private debtLedgerRepository: Repository<DebtLedger>,
    @InjectRepository(CashLedger)
    private cashLedgerRepository: Repository<CashLedger>,
    private dataSource: DataSource,
  ) {}

  async create(createReceiptDto: CreateReceiptDto) {
    return this.dataSource.transaction(async (manager) => {
      // 1. Tạo receipt
      const receipt = manager.create(Receipt, {
        storeId: createReceiptDto.storeId,
        shiftId: createReceiptDto.shiftId,
        receiptType: createReceiptDto.receiptType,
        amount: createReceiptDto.amount,
      });
      const savedReceipt = await manager.save(Receipt, receipt);

      // 2. Tạo receipt details nếu có
      if (createReceiptDto.details && createReceiptDto.details.length > 0) {
        for (const detail of createReceiptDto.details) {
          const receiptDetail = manager.create(ReceiptDetail, {
            receiptId: savedReceipt.id,
            customerId: detail.customerId,
            amount: detail.amount,
          });
          await manager.save(ReceiptDetail, receiptDetail);

          // Nếu là thanh toán nợ, ghi debt ledger
          if (createReceiptDto.receiptType === 'DEBT_PAYMENT') {
            const debtLedger = manager.create(DebtLedger, {
              customerId: detail.customerId,
              storeId: createReceiptDto.storeId,
              refType: 'PAYMENT',
              refId: savedReceipt.id,
              debit: 0,
              credit: detail.amount,
            });
            await manager.save(DebtLedger, debtLedger);
          }
        }
      }

      // 3. Ghi cash ledger (tiền vào quỹ)
      const cashLedger = manager.create(CashLedger, {
        storeId: createReceiptDto.storeId,
        refType: 'RECEIPT',
        refId: savedReceipt.id,
        cashIn: createReceiptDto.amount,
        cashOut: 0,
        ledgerAt: new Date(), // ⏰ Ghi nhận thời gian thu tiền (receipts.service.ts không có receiptAt trong DTO cũ)
      });
      await manager.save(CashLedger, cashLedger);

      return savedReceipt;
    });
  }

  async findByStore(storeId: number, limit = 50) {
    return this.receiptRepository.find({
      where: { storeId },
      relations: ['receiptDetails', 'receiptDetails.customer'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async findOne(id: number) {
    return this.receiptRepository.findOne({
      where: { id },
      relations: ['store', 'shift', 'receiptDetails', 'receiptDetails.customer'],
    });
  }
}
