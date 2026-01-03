import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CreateInventoryDocumentDto } from './dto/create-inventory-document.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @Post('documents')
  @Roles('STORE', 'SALES', 'ADMIN')
  createDocument(@Body() createDto: CreateInventoryDocumentDto) {
    return this.inventoryService.createDocument(createDto);
  }

  @Get('balance/:warehouseId')
  @Roles('STORE', 'SALES', 'ACCOUNTING', 'DIRECTOR', 'ADMIN')
  getInventoryBalance(@Param('warehouseId') warehouseId: string) {
    return this.inventoryService.getInventoryBalance(+warehouseId);
  }

  @Get('report/:warehouseId')
  @Roles('STORE', 'SALES', 'ACCOUNTING', 'DIRECTOR', 'ADMIN')
  getInventoryReport(@Param('warehouseId') warehouseId: string) {
    return this.inventoryService.getInventoryReport(+warehouseId);
  }

  @Get('all-stores')
  @Roles('SALES', 'ACCOUNTING', 'DIRECTOR', 'ADMIN')
  getAllStoresInventory() {
    return this.inventoryService.getAllStoresInventory();
  }
}
