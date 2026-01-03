import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expense } from '../entities/expense.entity';
import { ExpenseCategory } from '../entities/expense-category.entity';
import { CreateExpenseDto, UpdateExpenseDto } from './dto/expense.dto';

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(Expense)
    private expenseRepository: Repository<Expense>,
    @InjectRepository(ExpenseCategory)
    private categoryRepository: Repository<ExpenseCategory>,
  ) {}

  // Lấy tất cả danh mục chi phí
  async getAllCategories(): Promise<ExpenseCategory[]> {
    return this.categoryRepository.find({
      where: { isActive: true },
      order: { code: 'ASC' },
    });
  }

  // Lấy chi phí theo shift
  async getExpensesByShift(shiftId: number): Promise<Expense[]> {
    return this.expenseRepository.find({
      where: { shift: { id: shiftId } },
      relations: ['expenseCategory', 'createdBy', 'store'],
      order: { createdAt: 'ASC' },
    });
  }

  // Lấy chi phí theo store và ngày
  async getExpensesByStoreAndDateRange(
    storeId: number,
    startDate: string,
    endDate: string,
  ): Promise<Expense[]> {
    return this.expenseRepository
      .createQueryBuilder('expense')
      .leftJoinAndSelect('expense.expenseCategory', 'category')
      .leftJoinAndSelect('expense.createdBy', 'user')
      .leftJoinAndSelect('expense.shift', 'shift')
      .where('expense.store_id = :storeId', { storeId })
      .andWhere('expense.expense_date >= :startDate', { startDate })
      .andWhere('expense.expense_date <= :endDate', { endDate })
      .orderBy('expense.expense_date', 'ASC')
      .addOrderBy('expense.created_at', 'ASC')
      .getMany();
  }

  // Tạo chi phí mới
  async createExpense(
    dto: CreateExpenseDto,
    userId: number,
  ): Promise<Expense> {
    const category = await this.categoryRepository.findOne({
      where: { id: dto.expenseCategoryId },
    });

    if (!category) {
      throw new NotFoundException('Không tìm thấy danh mục chi phí');
    }

    const expense = this.expenseRepository.create({
      storeId: dto.storeId,
      expenseCategoryId: dto.expenseCategoryId,
      amount: dto.amount,
      description: dto.description,
      expenseDate: new Date(dto.expenseDate),
      paymentMethod: dto.paymentMethod || 'CASH',
      createdBy: userId,
    });

    return this.expenseRepository.save(expense);
  }

  // Cập nhật chi phí
  async updateExpense(
    id: number,
    dto: UpdateExpenseDto,
  ): Promise<Expense> {
    const expense = await this.expenseRepository.findOne({
      where: { id },
      relations: ['expenseCategory'],
    });

    if (!expense) {
      throw new NotFoundException('Không tìm thấy chi phí');
    }

    if (dto.expenseCategoryId) {
      const category = await this.categoryRepository.findOne({
        where: { id: dto.expenseCategoryId },
      });
      if (!category) {
        throw new NotFoundException('Không tìm thấy danh mục chi phí');
      }
      expense.expenseCategoryId = dto.expenseCategoryId;
    }

    if (dto.amount !== undefined) expense.amount = dto.amount;
    if (dto.description) expense.description = dto.description;
    if (dto.expenseDate) expense.expenseDate = new Date(dto.expenseDate);

    return this.expenseRepository.save(expense);
  }

  // Xóa chi phí
  async deleteExpense(id: number): Promise<void> {
    const expense = await this.expenseRepository.findOne({
      where: { id },
      relations: ['shift'],
    });

    if (!expense) {
      throw new NotFoundException('Không tìm thấy chi phí');
    }

    if (expense.shift) {
      throw new Error('Không thể xóa chi phí đã gắn với ca làm việc');
    }

    await this.expenseRepository.delete(id);
  }
}
