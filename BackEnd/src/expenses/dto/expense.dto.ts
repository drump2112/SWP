export class CreateExpenseDto {
  storeId: number;
  expenseCategoryId: number;
  amount: number;
  description: string;
  expenseDate: string; // YYYY-MM-DD
  paymentMethod?: string; // CASH, BANK_TRANSFER (default: CASH)
}

export class UpdateExpenseDto {
  expenseCategoryId?: number;
  amount?: number;
  description?: string;
  expenseDate?: string;
}
