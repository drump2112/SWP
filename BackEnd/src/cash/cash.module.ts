import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CashLedger } from '../entities/cash-ledger.entity';
import { CashService } from './cash.service';
import { CashController } from './cash.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CashLedger])],
  controllers: [CashController],
  providers: [CashService],
  exports: [CashService],
})
export class CashModule {}
