import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { getDatabaseConfig } from './config/database.config';

// Auth & Users
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';

// Organization
import { RegionsModule } from './regions/regions.module';
import { StoresModule } from './stores/stores.module';

// Products & Pricing
import { ProductsModule } from './products/products.module';

// Store Infrastructure
import { TanksModule } from './tanks/tanks.module';
import { PumpsModule } from './pumps/pumps.module';

// Store Operations
import { ShiftsModule } from './shifts/shifts.module';
import { CustomersModule } from './customers/customers.module';
import { ReceiptsModule } from './receipts/receipts.module';

// Inventory & Cash
import { InventoryModule } from './inventory/inventory.module';
import { CashModule } from './cash/cash.module';

// Expenses
import { ExpensesModule } from './expenses/expenses.module';

// Reports
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Database
    TypeOrmModule.forRoot(getDatabaseConfig()),

    // Auth & Users
    AuthModule,
    UsersModule,
    RolesModule,

    // Organization
    RegionsModule,
    StoresModule,

    // Products & Pricing
    ProductsModule,

    // Store Infrastructure
    TanksModule,
    PumpsModule,

    // Store Operations
    ShiftsModule,
    CustomersModule,
    ReceiptsModule,

    // Inventory & Cash
    InventoryModule,
    CashModule,

    // Expenses
    ExpensesModule,

    // Reports
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})

export class AppModule {}
