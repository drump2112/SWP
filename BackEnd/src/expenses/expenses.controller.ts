import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto, UpdateExpenseDto } from './dto/expense.dto';

@Controller('expenses')
@UseGuards(JwtAuthGuard)
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Get('categories')
  async getCategories() {
    return this.expensesService.getAllCategories();
  }

  @Get('shift/:shiftId')
  async getByShift(@Param('shiftId') shiftId: string) {
    return this.expensesService.getExpensesByShift(+shiftId);
  }

  @Get('store/:storeId')
  async getByStore(
    @Param('storeId') storeId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.expensesService.getExpensesByStoreAndDateRange(
      +storeId,
      startDate,
      endDate,
    );
  }

  @Post()
  async create(@Body() dto: CreateExpenseDto, @Request() req) {
    return this.expensesService.createExpense(dto, req.user.userId);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateExpenseDto) {
    return this.expensesService.updateExpense(+id, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.expensesService.deleteExpense(+id);
    return { message: 'Đã xóa chi phí' };
  }


  @Delete(':id')
  async delete2(@Param('id') id: string) {
    await this.expensesService.deleteExpense(+id);
    return { message: 'Đã xóa chi phí' };
  }
}
