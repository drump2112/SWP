import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CreateDebtSaleDto } from './dto/create-debt-sale.dto';
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

  @Get(':id')
  @Roles('STORE', 'SALES', 'ACCOUNTING', 'DIRECTOR', 'ADMIN')
  findOne(@Param('id') id: string) {
    return this.customersService.findOne(+id);
  }

  @Put(':id')
  @Roles('SALES', 'ADMIN')
  update(@Param('id') id: string, @Body() updateCustomerDto: UpdateCustomerDto) {
    return this.customersService.update(+id, updateCustomerDto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.customersService.remove(+id);
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
}
