import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { Sale } from '../entities/sale.entity';
import { Shift } from '../entities/shift.entity';
import { DebtLedger } from '../entities/debt-ledger.entity';
import { InventoryLedger } from '../entities/inventory-ledger.entity';
import { Store } from '../entities/store.entity';
import { Product } from '../entities/product.entity';
import { Customer } from '../entities/customer.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Sale,
      Shift,
      DebtLedger,
      InventoryLedger,
      Store,
      Product,
      Customer,
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
