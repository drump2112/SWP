import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CreateDebtSaleDto } from './dto/create-debt-sale.dto';
import { UpdateStoreCreditLimitDto } from './dto/update-store-credit-limit.dto';
import { ImportOpeningBalanceDto } from './dto/import-opening-balance.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Post()
  @Roles('SALES', 'ADMIN')
  create(@Body() createCustomerDto: CreateCustomerDto) {
    return this.customersService.create(createCustomerDto);
  }

  @Get()
  @Roles('STORE', 'SALES', 'ACCOUNTING', 'DIRECTOR', 'ADMIN')
  findAll(@Query('storeId') storeId?: string) {
    return this.customersService.findAll(storeId ? +storeId : undefined);
  }

  // ============ OPENING BALANCE ENDPOINTS ============
  // MUST be before @Get(':id') to avoid route conflict

  @Get('opening-balance')
  @Roles('ADMIN', 'ACCOUNTING', 'DIRECTOR')
  getOpeningBalanceRecords(@Query('storeId') storeId?: string) {
    return this.customersService.getOpeningBalanceRecords(storeId ? +storeId : undefined);
  }

  @Post('opening-balance/import')
  @Roles('ADMIN')
  importOpeningBalance(@Body() dto: ImportOpeningBalanceDto) {
    return this.customersService.importOpeningBalance(dto);
  }

  @Put('opening-balance/:id')
  @Roles('ADMIN', 'ACCOUNTING')
  updateOpeningBalance(
    @Param('id') id: string,
    @Body() body: { balance: number; notes?: string; createdAt?: string }
  ) {
    return this.customersService.updateOpeningBalance(+id, body.balance, body.notes, body.createdAt);
  }

  @Get(':id')
  @Roles('STORE', 'SALES', 'ACCOUNTING', 'DIRECTOR', 'ADMIN')
  findOne(@Param('id') id: string) {
    const numId = +id;
    if (isNaN(numId)) {
      throw new BadRequestException(`Invalid customer ID: ${id}`);
    }
    return this.customersService.findOne(numId);
  }

  @Put(':id')
  @Roles('SALES', 'ADMIN')
  update(@Param('id') id: string, @Body() updateCustomerDto: UpdateCustomerDto) {
    const numId = +id;
    if (isNaN(numId)) {
      throw new BadRequestException(`Invalid customer ID: ${id}`);
    }
    return this.customersService.update(numId, updateCustomerDto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    const numId = +id;
    if (isNaN(numId)) {
      throw new BadRequestException(`Invalid customer ID: ${id}`);
    }
    return this.customersService.remove(numId);
  }

  @Get(':id/balance')
  @Roles('STORE', 'SALES', 'ACCOUNTING', 'DIRECTOR', 'ADMIN')
  getDebtBalance(
    @Param('id') id: string,
    @Query('storeId') storeId?: string,
  ) {
    return this.customersService.getDebtBalance(+id, storeId ? +storeId : undefined);
  }

  @Get(':id/statement')
  @Roles('STORE', 'SALES', 'ACCOUNTING', 'DIRECTOR', 'ADMIN')
  getDebtStatement(
    @Param('id') id: string,
    @Query('storeId') storeId?: string,
  ) {
    return this.customersService.getDebtStatement(+id, storeId ? +storeId : undefined);
  }

  @Get('credit-status/all')
  @Roles('STORE', 'SALES', 'ACCOUNTING', 'DIRECTOR', 'ADMIN')
  getAllCreditStatus(@Query('storeId') storeId?: string) {
    return this.customersService.getAllCreditStatus(storeId ? +storeId : undefined);
  }

  @Get(':id/credit-status')
  @Roles('STORE', 'SALES', 'ACCOUNTING', 'DIRECTOR', 'ADMIN')
  getCreditStatus(
    @Param('id') id: string,
    @Query('storeId') storeId?: string,
  ) {
    return this.customersService.getCreditStatus(+id, storeId ? +storeId : undefined);
  }

  @Post('import')
  @Roles('SALES', 'ADMIN')
  @UseInterceptors(FileInterceptor('file'))
  async importCustomers(
    @UploadedFile() file: Express.Multer.File,
    @Query('storeId') storeId?: string,
  ) {
    return this.customersService.importFromExcel(file.buffer, storeId ? +storeId : undefined);
  }

  @Post('check-duplicate')
  @Roles('SALES', 'ADMIN')
  checkDuplicate(@Body() body: { name?: string; phone?: string; taxCode?: string }) {
    return this.customersService.checkDuplicate(body);
  }

  @Post('debt-sale')
  @Roles('STORE', 'SALES', 'ADMIN')
  createDebtSale(@Body() createDebtSaleDto: CreateDebtSaleDto) {
    return this.customersService.createDebtSale(createDebtSaleDto);
  }

  // ============ CREDIT LIMIT ENDPOINTS ============

  @Get(':customerId/store-credit-limits')
  @Roles('STORE', 'SALES', 'ACCOUNTING', 'DIRECTOR', 'ADMIN')
  getStoreCreditLimits(@Param('customerId') customerId: string) {
    return this.customersService.getStoreCreditLimits(+customerId);
  }

  @Put(':customerId/stores/:storeId/credit-limit')
  @Roles('SALES', 'ADMIN')
  updateStoreCreditLimit(
    @Param('customerId') customerId: string,
    @Param('storeId') storeId: string,
    @Body() dto: UpdateStoreCreditLimitDto
  ) {
    return this.customersService.updateStoreCreditLimit(+customerId, +storeId, dto);
  }

  @Post(':customerId/validate-debt-limit')
  @Roles('STORE', 'SALES', 'ADMIN')
  validateDebtLimit(
    @Param('customerId') customerId: string,
    @Body() body: { storeId: number; newDebtAmount: number }
  ) {
    return this.customersService.validateDebtLimit(
      +customerId,
      body.storeId,
      body.newDebtAmount
    );
  }
}
