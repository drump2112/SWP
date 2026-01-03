import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { CashService } from './cash.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('cash')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CashController {
  constructor(private cashService: CashService) {}

  @Get('balance/:storeId')
  @Roles('STORE', 'ACCOUNTING', 'DIRECTOR', 'ADMIN')
  getCashBalance(@Param('storeId') storeId: string) {
    return this.cashService.getCashBalance(+storeId);
  }

  @Get('ledger/:storeId')
  @Roles('STORE', 'ACCOUNTING', 'DIRECTOR', 'ADMIN')
  getCashLedger(@Param('storeId') storeId: string) {
    return this.cashService.getCashLedger(+storeId);
  }

  @Post('deposit')
  @Roles('STORE', 'ACCOUNTING', 'ADMIN')
  createDeposit(@Body() body: { storeId: number; amount: number }) {
    return this.cashService.createDeposit(body.storeId, body.amount);
  }
}
