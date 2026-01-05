import { Controller, Get, Post, Body, Param, UseGuards, Put, Delete, Query } from '@nestjs/common';
import { ShiftsService } from './shifts.service';
import { CreateShiftDto } from './dto/create-shift.dto';
import { CloseShiftDto } from './dto/close-shift.dto';
import { CreateShiftDebtSaleDto, CreateCashDepositDto, CreateReceiptDto } from './dto/shift-operations.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('shifts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShiftsController {
  constructor(private shiftsService: ShiftsService) {}

  @Post()
  @Roles('STORE', 'ADMIN')
  create(@Body() createShiftDto: CreateShiftDto) {
    return this.shiftsService.create(createShiftDto);
  }

  @Get()
  @Roles('ADMIN', 'DIRECTOR', 'SALES', 'ACCOUNTING')
  findAll() {
    return this.shiftsService.findAll();
  }

  @Get(':id')
  @Roles('STORE', 'SALES', 'ACCOUNTING', 'DIRECTOR', 'ADMIN')
  findOne(@Param('id') id: string) {
    return this.shiftsService.findOne(+id);
  }

  @Post('close')
  @Roles('STORE', 'ADMIN')
  closeShift(@Body() closeShiftDto: CloseShiftDto, @CurrentUser() user: any) {
    return this.shiftsService.closeShift(closeShiftDto, user);
  }

  @Put(':id/reopen')
  @Roles('ADMIN')
  reopenShift(@Param('id') id: string, @CurrentUser() user: any) {
    return this.shiftsService.reopenShift(+id, user);
  }

  @Get('report/:id')
  @Roles('STORE', 'SALES', 'ACCOUNTING', 'DIRECTOR', 'ADMIN')
  getShiftReport(@Param('id') id: string) {
    return this.shiftsService.getShiftReport(+id);
  }

  @Get('store/:storeId')
  @Roles('STORE', 'SALES', 'ACCOUNTING', 'DIRECTOR', 'ADMIN')
  findByStore(@Param('storeId') storeId: string) {
    return this.shiftsService.findByStore(+storeId);
  }

  // ==================== DEBT SALES ====================

  @Post('debt-sales')
  @Roles('STORE', 'ADMIN')
  createDebtSale(@Body() createDto: CreateShiftDebtSaleDto, @CurrentUser() user: any) {
    return this.shiftsService.createDebtSale(createDto, user);
  }

  @Get(':shiftId/debt-sales')
  @Roles('STORE', 'SALES', 'ACCOUNTING', 'DIRECTOR', 'ADMIN')
  getShiftDebtSales(@Param('shiftId') shiftId: string) {
    return this.shiftsService.getShiftDebtSales(+shiftId);
  }

  @Delete('debt-sales/:id')
  @Roles('STORE', 'ADMIN')
  deleteDebtSale(@Param('id') id: string) {
    return this.shiftsService.deleteDebtSale(+id);
  }

  // ==================== CASH DEPOSITS ====================

  @Post('cash-deposits')
  @Roles('STORE', 'ADMIN')
  createCashDeposit(@Body() createDto: CreateCashDepositDto, @CurrentUser() user: any) {
    return this.shiftsService.createCashDeposit(createDto, user);
  }

  @Get('cash-deposits/store/:storeId')
  @Roles('STORE', 'ACCOUNTING', 'DIRECTOR', 'ADMIN')
  getCashDeposits(
    @Param('storeId') storeId: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.shiftsService.getCashDeposits(+storeId, fromDate, toDate);
  }

  @Get(':shiftId/cash-deposits')
  @Roles('STORE', 'ACCOUNTING', 'DIRECTOR', 'ADMIN')
  getShiftCashDeposits(@Param('shiftId') shiftId: string) {
    return this.shiftsService.getShiftCashDeposits(+shiftId);
  }

  // ==================== RECEIPTS (PHIẾU THU) ====================

  @Post('receipts')
  @Roles('STORE', 'ADMIN')
  createReceipt(@Body() createDto: CreateReceiptDto, @CurrentUser() user: any) {
    return this.shiftsService.createReceipt(createDto, user);
  }

  @Get(':shiftId/receipts')
  @Roles('STORE', 'ACCOUNTING', 'DIRECTOR', 'ADMIN')
  getShiftReceipts(@Param('shiftId') shiftId: string) {
    return this.shiftsService.getShiftReceipts(+shiftId);
  }

  // ==================== PREVIOUS SHIFT READINGS ====================

  @Get(':shiftId/previous-readings')
  @Roles('STORE', 'ADMIN')
  getPreviousShiftReadings(@Param('shiftId') shiftId: string) {
    return this.shiftsService.getPreviousShiftReadings(+shiftId);
  }

}
