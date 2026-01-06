export class ImportCustomerDto {
  code?: string;
  name: string;
  taxCode?: string;
  address?: string;
  phone: string;
  type: string; // EXTERNAL or INTERNAL
  creditLimit?: number;
  notes?: string;
}

export class ImportCustomersResponseDto {
  success: number;
  failed: number;
  errors: Array<{
    row: number;
    data: any;
    error: string;
  }>;
  imported: any[];
}
