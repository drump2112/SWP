import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as XLSX from 'xlsx';
import { Customer } from '../entities/customer.entity';
import { CustomerStore } from '../entities/customer-store.entity';
import { DebtLedger } from '../entities/debt-ledger.entity';
import { Sale } from '../entities/sale.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CreateDebtSaleDto } from './dto/create-debt-sale.dto';
import { ImportCustomersResponseDto } from './dto/import-customers.dto';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    @InjectRepository(CustomerStore)
    private customerStoreRepository: Repository<CustomerStore>,
    @InjectRepository(DebtLedger)
    private debtLedgerRepository: Repository<DebtLedger>,
    @InjectRepository(Sale)
    private saleRepository: Repository<Sale>,
    private dataSource: DataSource,
  ) {}

  async create(createCustomerDto: CreateCustomerDto): Promise<Customer> {
    return this.dataSource.transaction(async (manager) => {
      // 1. Kiểm tra trùng MST (nếu có)
      if (createCustomerDto.taxCode) {
        const existByTax = await manager.findOne(Customer, {
          where: { taxCode: createCustomerDto.taxCode },
        });
        if (existByTax) {
          throw new BadRequestException(
            `Khách hàng với MST ${createCustomerDto.taxCode} đã tồn tại: ${existByTax.name} (${existByTax.code})`
          );
        }
      }

      // 2. Kiểm tra trùng Tên + SĐT (nếu có phone)
      if (createCustomerDto.phone) {
        const existByNamePhone = await manager
          .createQueryBuilder(Customer, 'c')
          .where('LOWER(c.name) = LOWER(:name)', { name: createCustomerDto.name })
          .andWhere('c.phone = :phone', { phone: createCustomerDto.phone })
          .getOne();

        if (existByNamePhone) {
          throw new BadRequestException(
            `Khách hàng "${createCustomerDto.name}" với SĐT ${createCustomerDto.phone} đã tồn tại (${existByNamePhone.code})`
          );
        }
      }

      // 3. Tự sinh mã nếu không nhập
      if (!createCustomerDto.code) {
        createCustomerDto.code = await this.generateCustomerCode(
          createCustomerDto.storeId,
          manager
        );
      } else {
        // 4. Kiểm tra mã không trùng (nếu nhập thủ công)
        const existByCode = await manager.findOne(Customer, {
          where: { code: createCustomerDto.code },
        });
        if (existByCode) {
          throw new BadRequestException(
            `Mã khách hàng ${createCustomerDto.code} đã tồn tại`
          );
        }
      }

      // 5. Tạo customer
      const { storeId, ...customerData } = createCustomerDto;
      const customer = manager.create(Customer, customerData);
      const savedCustomer = await manager.save(customer);

      // 6. Gắn vào customer_stores nếu có storeId
      if (storeId) {
        const customerStore = manager.create(CustomerStore, {
          customerId: savedCustomer.id,
          storeId: storeId,
        });
        await manager.save(customerStore);
      }

      return savedCustomer;
    });
  }

  private async generateCustomerCode(
    storeId?: number,
    manager?: any
  ): Promise<string> {
    const repository = manager
      ? manager.getRepository(Customer)
      : this.customerRepository;

    const prefix = 'KH';

    // Lấy mã khách hàng lớn nhất hiện tại
    const lastCustomer = await repository
      .createQueryBuilder('c')
      .where('c.code LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('c.code', 'DESC')
      .getOne();

    let nextNumber = 1;
    if (lastCustomer && lastCustomer.code) {
      // Trích xuất số từ mã cuối cùng (VD: KH00123 -> 123)
      const match = lastCustomer.code.match(/\d+$/);
      if (match) {
        nextNumber = parseInt(match[0], 10) + 1;
      }
    }

    // Đảm bảo mã sinh ra là unique (tránh trường hợp có gap do xóa)
    let code: string;
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 100) {
      code = `${prefix}${String(nextNumber).padStart(5, '0')}`;
      const exists = await repository.findOne({ where: { code } });
      if (!exists) {
        isUnique = true;
        return code;
      }
      nextNumber++;
      attempts++;
    }

    throw new BadRequestException('Không thể tạo mã khách hàng duy nhất');
  }

  async findAll(storeId?: number) {
    if (storeId) {
      // Lấy khách hàng của cửa hàng cụ thể
      return this.customerRepository
        .createQueryBuilder('c')
        .innerJoin('c.customerStores', 'cs')
        .where('cs.store_id = :storeId', { storeId })
        .getMany();
    }
    return this.customerRepository.find({
      relations: ['customerStores', 'customerStores.store'],
    });
  }

  async findOne(id: number): Promise<Customer> {
    const customer = await this.customerRepository.findOne({ where: { id } });
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }
    return customer;
  }

  async update(id: number, updateCustomerDto: UpdateCustomerDto): Promise<Customer> {
    const { storeId, ...customerData } = updateCustomerDto;
    const customer = await this.findOne(id);
    Object.assign(customer, customerData);
    const savedCustomer = await this.customerRepository.save(customer);

    if (storeId) {
      // Update store association
      // First, remove all existing associations for this customer
      await this.customerStoreRepository.delete({ customerId: id });

      // Then create new association
      const customerStore = this.customerStoreRepository.create({
        customerId: id,
        storeId: storeId,
      });
      await this.customerStoreRepository.save(customerStore);
    }

    return savedCustomer;
  }

  async remove(id: number): Promise<void> {
    const customer = await this.findOne(id);
    await this.customerRepository.remove(customer);
  }

  async getDebtBalance(customerId: number, storeId?: number) {
    const query = this.debtLedgerRepository
      .createQueryBuilder('dl')
      .select('SUM(dl.debit - dl.credit)', 'balance')
      .where('dl.customer_id = :customerId', { customerId });
      // TODO: Thêm .andWhere('dl.superseded_by_shift_id IS NULL') sau khi chạy migration

    if (storeId) {
      query.andWhere('dl.store_id = :storeId', { storeId });
    }

    const result = await query.getRawOne();
    return { customerId, storeId, balance: Number(result?.balance || 0) };
  }

  async createDebtSale(createDebtSaleDto: CreateDebtSaleDto) {
    return this.dataSource.transaction(async (manager) => {
      let totalAmount = 0;
      const sales: Sale[] = [];

      // 1. Tạo sales records
      for (const item of createDebtSaleDto.items) {
        const amount = item.quantity * item.unitPrice;
        totalAmount += amount;

        const sale = manager.create(Sale, {
          shiftId: createDebtSaleDto.shiftId,
          storeId: createDebtSaleDto.storeId,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount,
          customerId: createDebtSaleDto.customerId,
        });
        const savedSale = await manager.save(Sale, sale);
        sales.push(savedSale);
      }

      // 2. Ghi debt ledger (phát sinh nợ)
      const debtLedger = manager.create(DebtLedger, {
        customerId: createDebtSaleDto.customerId,
        storeId: createDebtSaleDto.storeId,
        refType: 'SALE',
        refId: sales[0]?.id,
        debit: totalAmount,
        credit: 0,
      });
      await manager.save(DebtLedger, debtLedger);

      return {
        sales,
        debtLedger,
        totalAmount,
      };
    });
  }

  async getDebtStatement(customerId: number, storeId?: number) {
    const query = this.debtLedgerRepository
      .createQueryBuilder('dl')
      .where('dl.customer_id = :customerId', { customerId })
      .orderBy('dl.created_at', 'ASC');

    if (storeId) {
      query.andWhere('dl.store_id = :storeId', { storeId });
    }

    const ledgers = await query.getMany();

    let balance = 0;
    const statement = ledgers.map((ledger) => {
      balance += Number(ledger.debit) - Number(ledger.credit);
      return {
        ...ledger,
        balance,
      };
    });

    return {
      customerId,
      storeId,
      ledgers: statement,
      currentBalance: balance,
    };
  }

  async getAllCreditStatus(storeId?: number) {
    // 1. Lấy danh sách khách hàng (có thể filter theo store nếu cần thiết,
    // nhưng hiện tại customer là global, chỉ debt là theo store)
    // Tuy nhiên, để tính debt chính xác theo store, ta cần join với debt_ledger

    const query = this.customerRepository.createQueryBuilder('c')
      .select([
        'c.id as "customerId"',
        'c.name as "customerName"',
        'c.code as "customerCode"',
        'c.type as "customerType"',
        'c.credit_limit as "creditLimit"'
      ])
      .addSelect(subQuery => {
        return subQuery
          .select('COALESCE(SUM(dl.debit - dl.credit), 0)')
          .from(DebtLedger, 'dl')
          .where('dl.customer_id = c.id')
          .andWhere(storeId ? 'dl.store_id = :storeId' : '1=1', { storeId });
      }, 'currentDebt');

    // Nếu có storeId, có thể muốn chỉ lấy những khách hàng đã từng giao dịch ở store đó?
    // Hoặc lấy tất cả khách hàng nhưng debt chỉ tính ở store đó.
    // Ở đây ta lấy tất cả khách hàng.

    const results = await query.getRawMany();

    return results.map(row => {
      const creditLimit = Number(row.creditLimit || 0);
      const currentDebt = Number(row.currentDebt || 0);
      const availableCredit = creditLimit - currentDebt;
      const creditUsagePercent = creditLimit > 0 ? (currentDebt / creditLimit) * 100 : 0;

      return {
        customerId: row.customerId,
        customerName: row.customerName,
        customerCode: row.customerCode,
        customerType: row.customerType,
        storeId,
        creditLimit,
        currentDebt,
        availableCredit,
        creditUsagePercent: Math.round(creditUsagePercent * 100) / 100,
        isOverLimit: currentDebt > creditLimit,
        warningLevel: this.getCreditWarningLevel(creditUsagePercent),
      };
    });
  }

  async getCreditStatus(customerId: number, storeId?: number) {
    // Get customer info including credit limit
    const customer = await this.findOne(customerId);

    // Get current debt balance
    const { balance } = await this.getDebtBalance(customerId, storeId);

    // Calculate available credit
    const creditLimit = Number(customer.creditLimit || 0);
    const availableCredit = creditLimit - balance;
    const creditUsagePercent = creditLimit > 0 ? (balance / creditLimit) * 100 : 0;

    return {
      customerId,
      customerName: customer.name,
      customerCode: customer.code,
      customerType: customer.type,
      storeId,
      creditLimit,
      currentDebt: balance,
      availableCredit,
      creditUsagePercent: Math.round(creditUsagePercent * 100) / 100,
      isOverLimit: balance > creditLimit,
      warningLevel: this.getCreditWarningLevel(creditUsagePercent),
    };
  }

  private getCreditWarningLevel(usagePercent: number): 'safe' | 'warning' | 'danger' | 'overlimit' {
    if (usagePercent >= 100) return 'overlimit';
    if (usagePercent >= 90) return 'danger';
    if (usagePercent >= 75) return 'warning';
    return 'safe';
  }

  async checkDuplicate(query: {
    name?: string;
    phone?: string;
    taxCode?: string;
  }) {
    const duplicates: any[] = [];

    // Check MST
    if (query.taxCode) {
      const byTax = await this.customerRepository.findOne({
        where: { taxCode: query.taxCode },
      });
      if (byTax) {
        duplicates.push({
          type: 'taxCode',
          field: 'Mã số thuế',
          value: query.taxCode,
          customer: byTax,
        });
      }
    }

    // Check Tên + SĐT
    if (query.name && query.phone) {
      const byNamePhone = await this.customerRepository
        .createQueryBuilder('c')
        .where('LOWER(c.name) = LOWER(:name)', { name: query.name })
        .andWhere('c.phone = :phone', { phone: query.phone })
        .getOne();

      if (byNamePhone) {
        duplicates.push({
          type: 'namePhone',
          field: 'Tên + Số điện thoại',
          value: `${query.name} - ${query.phone}`,
          customer: byNamePhone,
        });
      }
    }

    return {
      hasDuplicate: duplicates.length > 0,
      duplicates,
    };
  }

  async importFromExcel(buffer: Buffer, storeId?: number): Promise<ImportCustomersResponseDto> {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Read customer type from row 3 (hidden row in template)
    const typeCell = worksheet['A3'];
    const customerType = typeCell ? typeCell.v : 'EXTERNAL';

    // Parse data starting from row 5 (row 1=title, 2=instructions, 3=type, 4=headers, 5+=data)
    const rawData: any[] = XLSX.utils.sheet_to_json(worksheet, {
      range: 4, // Start from row 5 (0-indexed, so 4)
      defval: null
    });

    const response: ImportCustomersResponseDto = {
      success: 0,
      failed: 0,
      errors: [],
      imported: [],
    };

    // Cache để tracking mã đã sinh trong batch này
    const generatedCodes = new Set<string>();

    // Lấy mã lớn nhất hiện tại 1 lần
    const lastCustomer = await this.customerRepository
      .createQueryBuilder('c')
      .where('c.code LIKE :prefix', { prefix: 'KH%' })
      .orderBy('c.code', 'DESC')
      .getOne();

    let nextNumber = 1;
    if (lastCustomer && lastCustomer.code) {
      const match = lastCustomer.code.match(/\d+$/);
      if (match) {
        nextNumber = parseInt(match[0], 10) + 1;
      }
    }

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const rowNumber = i + 5; // Actual row in Excel

      try {
        // Skip empty rows
        if (!row['Tên khách hàng (*)'] && !row['Số điện thoại (*)']) {
          continue;
        }

        // Validate required fields
        if (!row['Tên khách hàng (*)']) {
          throw new Error('Thiếu tên khách hàng');
        }
        if (!row['Số điện thoại (*)']) {
          throw new Error('Thiếu số điện thoại');
        }

        // Tự sinh mã nếu bỏ trống
        let code = row['Mã KH'] || undefined;
        if (!code) {
          // Sinh mã và kiểm tra trùng lặp trong vòng lặp
          let isUnique = false;
          let attempts = 0;
          while (!isUnique && attempts < 100) {
            code = `KH${String(nextNumber).padStart(5, '0')}`;
            // Kiểm tra trùng trong DB
            const existsInDb = await this.customerRepository.findOne({ where: { code } });
            if (!existsInDb && !generatedCodes.has(code)) {
              isUnique = true;
              generatedCodes.add(code);
            }
            nextNumber++;
            attempts++;
          }

          if (!isUnique) {
            throw new Error('Không thể tạo mã khách hàng duy nhất sau 100 lần thử');
          }
        } else {
          // Kiểm tra mã thủ công không trùng
          if (generatedCodes.has(code)) {
            throw new Error(`Mã ${code} trùng với mã đã tự sinh trong batch này`);
          }
          // Kiểm tra mã thủ công không trùng trong DB
          const existsInDb = await this.customerRepository.findOne({ where: { code } });
          if (existsInDb) {
            throw new Error(`Mã ${code} đã tồn tại trong hệ thống`);
          }
        }

        // Create customer DTO
        const customerDto: CreateCustomerDto = {
          code,
          name: row['Tên khách hàng (*)'],
          taxCode: row['Mã số thuế'] || undefined,
          address: row['Địa chỉ'] || undefined,
          phone: row['Số điện thoại (*)'],
          type: customerType,
          creditLimit: customerType === 'EXTERNAL' && row['Hạn mức công nợ']
            ? Number(row['Hạn mức công nợ'])
            : undefined,
          notes: row['Ghi chú'] || undefined,
          storeId,
        };

        // Import customer
        const customer = await this.create(customerDto);

        response.success++;
        response.imported.push({
          row: rowNumber,
          code: customer.code,
          name: customer.name,
          phone: customer.phone,
        });

      } catch (error) {
        response.failed++;
        response.errors.push({
          row: rowNumber,
          data: row,
          error: error.message || 'Lỗi không xác định',
        });
      }
    }

    return response;
  }
}
