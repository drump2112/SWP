import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryDocument } from '../entities/inventory-document.entity';
import { InventoryDocumentItem } from '../entities/inventory-document-item.entity';
import { InventoryLedger } from '../entities/inventory-ledger.entity';
import { Warehouse } from '../entities/warehouse.entity';
import { Tank } from '../entities/tank.entity';
import { InventoryTruckCompartment } from '../entities/inventory-truck-compartment.entity';
import { InventoryLossCalculation } from '../entities/inventory-loss-calculation.entity';
import { Product } from '../entities/product.entity';
import { Store } from '../entities/store.entity';
import { InventoryClosing } from '../entities/inventory-closing.entity';
import { StoreLossConfig } from '../entities/store-loss-config.entity';
import { InventoryCheck } from '../entities/inventory-check.entity';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { InventoryClosingController } from './inventory-closing.controller';
import { InventoryClosingService } from './inventory-closing.service';
import { InventoryCheckController } from './inventory-check.controller';
import { InventoryCheckService } from './inventory-check.service';
import { PetroleumCalculationService } from './petroleum-calculation.service';
import { InventoryExportService } from './inventory-export.service';
import { InventoryStockCalculatorService } from './inventory-stock-calculator.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InventoryDocument,
      InventoryDocumentItem,
      InventoryLedger,
      Warehouse,
      Tank,
      InventoryTruckCompartment,
      InventoryLossCalculation,
      Product,
      Store,
      InventoryClosing,
      StoreLossConfig,
      InventoryCheck,
    ]),
  ],
  controllers: [InventoryController, InventoryClosingController, InventoryCheckController],
  providers: [
    InventoryService,
    InventoryClosingService,
    InventoryCheckService,
    PetroleumCalculationService,
    InventoryExportService,
    InventoryStockCalculatorService,
  ],
  exports: [InventoryService, InventoryStockCalculatorService, InventoryClosingService, InventoryCheckService],
})
export class InventoryModule {}
