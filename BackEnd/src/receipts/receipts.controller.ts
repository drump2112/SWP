import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ReceiptsService } from './receipts.service';
import { CreateReceiptDto } from './dto/create-receipt.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('receipts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReceiptsController {
  constructor(private receiptsService: ReceiptsService) {}

  @Post()
  @Roles('STORE', 'ACCOUNTING', 'ADMIN')
  create(@Body() createReceiptDto: CreateReceiptDto) {
    return this.receiptsService.create(createReceiptDto);
  }

  @Get('store/:storeId')
  @Roles('STORE', 'ACCOUNTING', 'DIRECTOR', 'ADMIN')
  findByStore(@Param('storeId') storeId: string) {
    return this.receiptsService.findByStore(+storeId);
  }

  @Get(':id')
  @Roles('STORE', 'ACCOUNTING', 'DIRECTOR', 'ADMIN')
  findOne(@Param('id') id: string) {
    return this.receiptsService.findOne(+id);
  }
}
