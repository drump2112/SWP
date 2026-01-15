import { Controller, Get, Post, Put, Body, Param, UseGuards, Query } from '@nestjs/common';
import { CashService } from './cash.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { OpeningBalanceCashDto } from './dto/opening-balance-cash.dto';

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

  /**
   * POST /cash/opening-balance
   * Nhập số dư đầu kỳ cho sổ quỹ tiền mặt
   * Chỉ ADMIN và ACCOUNTING được phép
   */
  @Post('opening-balance')
  @Roles('ADMIN', 'ACCOUNTING')
  setOpeningBalance(@Body() dto: OpeningBalanceCashDto) {
    return this.cashService.setOpeningBalance(dto);
  }

  /**
   * GET /cash/opening-balance
   * Lấy danh sách các bản ghi số dư đầu kỳ
   * Có thể filter theo storeId
   */
  @Get('opening-balance')
  @Roles('ADMIN', 'ACCOUNTING', 'DIRECTOR')
  getOpeningBalanceRecords(@Query('storeId') storeId?: string) {
    return this.cashService.getOpeningBalanceRecords(storeId ? +storeId : undefined);
  }

  /**
   * PUT /cash/opening-balance
   * Cập nhật số dư đầu kỳ đã tạo
   */
  @Put('opening-balance')
  @Roles('ADMIN', 'ACCOUNTING')
  updateOpeningBalance(@Body() body: { id: number; openingBalance: number; notes?: string; effectiveDate?: string }) {
    return this.cashService.updateOpeningBalance(body.id, body.openingBalance, body.notes, body.effectiveDate);
  }
}
