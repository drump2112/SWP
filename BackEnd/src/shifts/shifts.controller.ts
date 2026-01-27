import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Put,
  Delete,
  Query,
} from '@nestjs/common';
import { ShiftsService } from './shifts.service';
import { CreateShiftDto } from './dto/create-shift.dto';
import { CloseShiftDto } from './dto/close-shift.dto';
import { UpdateOpeningInfoDto } from './dto/update-opening-info.dto';
import { UpdateShiftTimesDto } from './dto/update-shift-times.dto';
import {
  CreateShiftDebtSaleDto,
  CreateCashDepositDto,
  CreateReceiptDto,
} from './dto/shift-operations.dto';
import { CreateCheckpointDto } from './dto/create-checkpoint.dto';
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

  @Put(':id')
  @Roles('STORE', 'ADMIN')
  update(
    @Param('id') id: string,
    @Body() closeShiftDto: CloseShiftDto,
    @CurrentUser() user: any,
  ) {
    console.log('Updating shift with ID:', id);
    return this.shiftsService.update(+id, closeShiftDto, user);
  }

  @Put(':id/opening-info')
  @Roles('STORE', 'ADMIN')
  updateOpeningInfo(
    @Param('id') id: string,
    @Body() dto: UpdateOpeningInfoDto,
    @CurrentUser() user: any,
  ) {
    return this.shiftsService.updateOpeningInfo(+id, dto, user);
  }

  @Put(':id/times')
  @Roles('ADMIN')
  updateShiftTimes(
    @Param('id') id: string,
    @Body() dto: UpdateShiftTimesDto,
    @CurrentUser() user: any,
  ) {
    return this.shiftsService.updateShiftTimes(+id, dto, user);
  }

  @Put(':id/reopen')
  @Roles('ADMIN')
  reopenShift(@Param('id') id: string, @CurrentUser() user: any) {
    return this.shiftsService.reopenShift(+id, user);
  }

  @Put(':id/enable-edit')
  @Roles('ADMIN')
  enableEdit(@Param('id') id: string, @CurrentUser() user: any) {
    return this.shiftsService.enableEdit(+id, user);
  }

  @Put(':id/lock')
  @Roles('ADMIN')
  lockShift(@Param('id') id: string, @CurrentUser() user: any) {
    return this.shiftsService.lockShift(+id, user);
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
  createDebtSale(
    @Body() createDto: CreateShiftDebtSaleDto,
    @CurrentUser() user: any,
  ) {
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
  createCashDeposit(
    @Body() createDto: CreateCashDepositDto,
    @CurrentUser() user: any,
  ) {
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

  // ==================== CHECKPOINTS (KIỂM KÊ GIỮA CA) ====================

  /**
   * Tạo checkpoint (kiểm kê) trong ca đang mở
   * POST /shifts/:shiftId/checkpoint
   */
  @Post(':shiftId/checkpoint')
  @Roles('STORE', 'ADMIN')
  createCheckpoint(
    @Param('shiftId') shiftId: string,
    @Body() dto: CreateCheckpointDto,
    @CurrentUser() user: any,
  ) {
    return this.shiftsService.createCheckpoint(+shiftId, dto, user.id);
  }

  /**
   * Lấy danh sách checkpoint của một ca
   * GET /shifts/:shiftId/checkpoints
   */
  @Get(':shiftId/checkpoints')
  @Roles('STORE', 'SALES', 'ACCOUNTING', 'DIRECTOR', 'ADMIN')
  getCheckpoints(@Param('shiftId') shiftId: string) {
    return this.shiftsService.getCheckpoints(+shiftId);
  }

  /**
   * Xóa checkpoint (chỉ được xóa checkpoint cuối cùng của ca đang mở)
   * DELETE /shifts/:shiftId/checkpoint/:checkpointId
   */
  @Delete(':shiftId/checkpoint/:checkpointId')
  @Roles('STORE', 'ADMIN')
  deleteCheckpoint(
    @Param('shiftId') shiftId: string,
    @Param('checkpointId') checkpointId: string,
    @CurrentUser() user: any,
  ) {
    return this.shiftsService.deleteCheckpoint(+shiftId, +checkpointId, user.id);
  }
}
