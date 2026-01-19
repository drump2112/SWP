import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
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
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DebtLedger,
      Sale,
      CashLedger,
      InventoryLedger,
      Shift,
      Customer,
      Store,
      ShiftDebtSale,
      Receipt,
      ReceiptDetail,
      CashDeposit,
      PumpReading,
      InventoryDocument,
      InventoryDocumentItem,
      Product,
      Warehouse,
      ProductPrice,
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}