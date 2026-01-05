import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Customer } from '../entities/customer.entity';
import { CustomerStore } from '../entities/customer-store.entity';
import { DebtLedger } from '../entities/debt-ledger.entity';
import { Sale } from '../entities/sale.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CreateDebtSaleDto } from './dto/create-debt-sale.dto';

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

    const prefix = storeId ? `CH${storeId}-KH` : 'KH';
    const count = await repository.count();
    const sequence = String(count + 1).padStart(5, '0');

    return `${prefix}${sequence}`;
    // Ví dụ: CH1-KH00001, KH00001
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
}
