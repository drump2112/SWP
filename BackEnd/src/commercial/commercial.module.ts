import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SuppliersModule } from './suppliers/suppliers.module';
import { WarehousesModule } from './warehouses/warehouses.module';
import { CustomerGroupsModule } from './customer-groups/customer-groups.module';
import { CommercialCustomersModule } from './customers/commercial-customers.module';
import { ImportBatchesModule } from './import-batches/import-batches.module';
import { ExportOrdersModule } from './export-orders/export-orders.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    SuppliersModule,
    WarehousesModule,
    CustomerGroupsModule,
    CommercialCustomersModule,
    ImportBatchesModule,
    ExportOrdersModule,
    ReportsModule,
  ],
})
export class CommercialModule {}
