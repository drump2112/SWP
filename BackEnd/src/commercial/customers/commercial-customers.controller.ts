import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { CommercialCustomersService } from './commercial-customers.service';
import { CreateCommercialCustomerDto } from './dto/create-commercial-customer.dto';
import { UpdateCommercialCustomerDto } from './dto/update-commercial-customer.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('commercial/customers')
@UseGuards(JwtAuthGuard)
export class CommercialCustomersController {
  constructor(private readonly customersService: CommercialCustomersService) {}

  @Post()
  create(@Body() createCustomerDto: CreateCommercialCustomerDto) {
    return this.customersService.create(createCustomerDto);
  }

  @Get()
  findAll(@Query('group_id') groupId?: string) {
    if (groupId) {
      return this.customersService.findByGroup(+groupId);
    }
    return this.customersService.findAll();
  }

  @Get('active')
  findActive() {
    return this.customersService.findActive();
  }

  @Get('with-debt')
  findWithDebt() {
    return this.customersService.getCustomersWithDebt();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.customersService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCustomerDto: UpdateCommercialCustomerDto) {
    return this.customersService.update(+id, updateCustomerDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.customersService.remove(+id);
  }
}
