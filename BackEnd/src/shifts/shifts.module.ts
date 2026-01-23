import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
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
import { Expense } from '../entities/expense.entity';
import { Warehouse } from '../entities/warehouse.entity';
import { ShiftCheckpoint } from '../entities/shift-checkpoint.entity';
import { ShiftCheckpointReading } from '../entities/shift-checkpoint-reading.entity';
import { ShiftCheckpointStock } from '../entities/shift-checkpoint-stock.entity';
import { ShiftsService } from './shifts.service';
import { ShiftsController } from './shifts.controller';
import { CustomersModule } from '../customers/customers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Shift,
      PumpReading,
      Sale,
      InventoryLedger,
      ProductPrice,
      AuditLog,
      ShiftDebtSale,
      CashDeposit,
      DebtLedger,
      CashLedger,
      Receipt,
      ReceiptDetail,
      Expense,
      Warehouse,
      ShiftCheckpoint,
      ShiftCheckpointReading,
      ShiftCheckpointStock,
    ]),
    CustomersModule,
  ],
  controllers: [ShiftsController],
  providers: [ShiftsService],
  exports: [ShiftsService],
})
export class ShiftsModule {}
