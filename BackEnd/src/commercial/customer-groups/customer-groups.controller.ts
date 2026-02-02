import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { CustomerGroupsService } from './customer-groups.service';
import { CreateCustomerGroupDto } from './dto/create-customer-group.dto';
import { UpdateCustomerGroupDto } from './dto/update-customer-group.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('commercial/customer-groups')
@UseGuards(JwtAuthGuard)
export class CustomerGroupsController {
  constructor(private readonly customerGroupsService: CustomerGroupsService) {}

  @Post()
  create(@Body() createGroupDto: CreateCustomerGroupDto) {
    return this.customerGroupsService.create(createGroupDto);
  }

  @Get()
  findAll() {
    return this.customerGroupsService.findAll();
  }

  @Get('active')
  findActive() {
    return this.customerGroupsService.findActive();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.customerGroupsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateGroupDto: UpdateCustomerGroupDto) {
    return this.customerGroupsService.update(+id, updateGroupDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.customerGroupsService.remove(+id);
  }
}
