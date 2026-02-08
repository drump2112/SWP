import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Not } from 'typeorm';
import * as XLSX from 'xlsx';
import { Customer } from '../entities/customer.entity';
import { CustomerStore } from '../entities/customer-store.entity';
import { DebtLedger } from '../entities/debt-ledger.entity';
import { Sale } from '../entities/sale.entity';
import { Store } from '../entities/store.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CreateDebtSaleDto } from './dto/create-debt-sale.dto';
import { ImportCustomersResponseDto } from './dto/import-customers.dto';
import { UpdateStoreCreditLimitDto, ToggleCustomerBypassDto } from './dto/update-store-credit-limit.dto';
import { ImportOpeningBalanceDto, ImportOpeningBalanceResponseDto } from './dto/import-opening-balance.dto';

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
    @InjectRepository(Store)
    private storeRepository: Repository<Store>,
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
    // Soft delete: set isActive to false
    customer.isActive = false;
    await this.customerRepository.save(customer);
  }

  async toggleActive(id: number): Promise<Customer> {
    const customer = await this.findOne(id);
    customer.isActive = !customer.isActive;
    return this.customerRepository.save(customer);
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
        const amount = Math.round(item.quantity * item.unitPrice); // Làm tròn để tránh phần thập phân
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
    // 1. Lấy danh sách khách hàng với credit status
    let query = this.customerRepository.createQueryBuilder('c')
      .select([
        'c.id as "customerId"',
        'c.name as "customerName"',
        'c.code as "customerCode"',
        'c.type as "customerType"',
        'c.credit_limit as "defaultCreditLimit"',
        'c.bypass_credit_limit as "globalBypassCreditLimit"',
        'c.bypass_until as "globalBypassUntil"'
      ])
      .addSelect(subQuery => {
        return subQuery
          .select('COALESCE(SUM(dl.debit - dl.credit), 0)')
          .from(DebtLedger, 'dl')
          .where('dl.customer_id = c.id')
          .andWhere(storeId ? 'dl.store_id = :storeId' : '1=1', { storeId });
      }, 'currentDebt');

    // Nếu có storeId, join với customer_stores để lấy creditLimit riêng và bypass status của cửa hàng đó
    if (storeId) {
      query = query
        .leftJoin('customer_stores', 'cs', 'cs.customer_id = c.id AND cs.store_id = :storeId', { storeId })
        .addSelect('cs.credit_limit', 'storeCreditLimit')
        .addSelect('cs.bypass_credit_limit', 'storeBypassCreditLimit')
        .addSelect('cs.bypass_until', 'storeBypassUntil');
      // KHÔNG dùng WHERE cs.store_id vì nó sẽ loại bỏ khách hàng chưa có record trong customer_stores
      // Điều kiện store_id đã được filter trong LEFT JOIN ON clause
    } else {
      // Admin (không có storeId) - lấy tất cả khách hàng
      // Lấy hạn mức cao nhất từ các cửa hàng nếu customers.credit_limit = 0 hoặc NULL
      query = query
        .addSelect(subQuery => {
          return subQuery
            .select('MAX(CASE WHEN cs.bypass_credit_limit = true AND (cs.bypass_until IS NULL OR cs.bypass_until >= NOW()) THEN 1 ELSE 0 END)')
            .from('customer_stores', 'cs')
            .where('cs.customer_id = c.id');
        }, 'anyStoreBypassActive')
        // Lấy hạn mức cao nhất từ tất cả các cửa hàng
        .addSelect(subQuery => {
          return subQuery
            .select('MAX(cs.credit_limit)')
            .from('customer_stores', 'cs')
            .where('cs.customer_id = c.id')
            .andWhere('cs.credit_limit IS NOT NULL');
        }, 'maxStoreCreditLimit')
        .addSelect('NULL', 'storeBypassCreditLimit')
        .addSelect('NULL', 'storeBypassUntil');
    }

    const results = await query.getRawMany();

    return results.map(row => {
      const defaultCreditLimit = Number(row.defaultCreditLimit || 0);
      const storeCreditLimit = row.storeCreditLimit; // Khi có storeId cụ thể
      const maxStoreCreditLimit = row.maxStoreCreditLimit; // Hạn mức cao nhất từ tất cả cửa hàng (ADMIN view)
      
      // Tính hạn mức hiệu lực:
      // 1. Nếu có storeId → Dùng hạn mức riêng của store đó, fallback về default
      // 2. Nếu ADMIN (không có storeId):
      //    - Nếu defaultCreditLimit > 0 → Dùng default
      //    - Nếu defaultCreditLimit = 0 hoặc NULL → Dùng MAX hạn mức từ các cửa hàng
      let creditLimit: number;
      if (storeId) {
        // User của cửa hàng cụ thể
        creditLimit = storeCreditLimit !== null && storeCreditLimit !== undefined
          ? Number(storeCreditLimit)
          : defaultCreditLimit;
      } else {
        // Admin view - Ưu tiên default, nếu = 0 thì lấy max từ stores
        if (defaultCreditLimit > 0) {
          creditLimit = defaultCreditLimit;
        } else {
          creditLimit = maxStoreCreditLimit !== null && maxStoreCreditLimit !== undefined
            ? Number(maxStoreCreditLimit)
            : 0;
        }
      }

      const currentDebt = Number(row.currentDebt || 0);
      const availableCredit = creditLimit - currentDebt;
      const creditUsagePercent = creditLimit > 0 ? (currentDebt / creditLimit) * 100 : 0;

      // Check bypass status
      const isBypassSet = (value: any) => {
        if (value === null || value === undefined || value === 0 || value === '0' || value === false) return false;
        return true;
      };

      const isDateExpired = (dateStr: any) => {
        if (!dateStr) return false; // Null/undefined = vô thời hạn
        try {
          return new Date(dateStr).getTime() < Date.now(); // Sửa <= thành < để nhất quán
        } catch {
          return false;
        }
      };

      // Nếu có storeId, check bypass của store đó; nếu không, check nếu có ANY store nào được bypass
      let storeBypassActive = false;
      if (storeId) {
        storeBypassActive = !!(isBypassSet(row.storeBypassCreditLimit) && !isDateExpired(row.storeBypassUntil));
      } else {
        // Admin - check nếu có ANY store được bypass
        storeBypassActive = !!(Number(row.anyStoreBypassActive) === 1);
      }

      const globalBypassActive = isBypassSet(row.globalBypassCreditLimit) && !isDateExpired(row.globalBypassUntil);
      const isBypassed = globalBypassActive || storeBypassActive;

      return {
        customerId: row.customerId,
        customerName: row.customerName,
        customerCode: row.customerCode,
        customerType: row.customerType,
        storeId,
        creditLimit, // Hạn mức hiệu lực (ưu tiên store limit, fallback về default)
        currentDebt,
        availableCredit,
        creditUsagePercent: Math.round(creditUsagePercent * 100) / 100,
        isOverLimit: currentDebt > creditLimit,
        bypassCreditLimit: storeId ? isBypassSet(row.storeBypassCreditLimit) : isBypassSet(row.globalBypassCreditLimit),
        isBypassed,
        warningLevel: this.getCreditWarningLevel(creditUsagePercent, creditLimit, isBypassed, row.customerType),
      };
    });
  }

  async getCreditStatus(customerId: number, storeId?: number) {
    // Get customer info including credit limit
    const customer = await this.findOne(customerId);

    // Get current debt balance
    const { balance } = await this.getDebtBalance(customerId, storeId);

    // Lấy hạn mức hiệu lực (ưu tiên hạn mức riêng của store)
    const creditLimit = storeId 
      ? await this.getEffectiveCreditLimit(customerId, storeId)
      : Number(customer.creditLimit || 0);

    const availableCredit = creditLimit - balance;
    const creditUsagePercent = creditLimit > 0 ? (balance / creditLimit) * 100 : 0;

    // Check bypass status - xét cả global và store-level bypass
    const isBypassSet = (value: any) => {
      if (value === null || value === undefined || value === 0 || value === '0' || value === false) return false;
      return true;
    };

    const isDateExpired = (date: any) => {
      if (!date) return false; // Null/undefined = vô thời hạn
      try {
        return date.getTime ? date.getTime() < Date.now() : new Date(date).getTime() < Date.now();
      } catch {
        return false;
      }
    };

    const globalBypassActive = isBypassSet(customer.bypassCreditLimit) && !isDateExpired(customer.bypassUntil);

    let storeBypassActive = false;
    if (storeId && customer.customerStores?.length > 0) {
      const cs = customer.customerStores.find(cs => cs.storeId === storeId);
      storeBypassActive = !!(cs && isBypassSet(cs.bypassCreditLimit) && !isDateExpired(cs.bypassUntil));
    }

    const isBypassed = globalBypassActive || storeBypassActive;

    return {
      customerId,
      customerName: customer.name,
      customerCode: customer.code,
      customerType: customer.type,
      storeId,
      creditLimit, // Hạn mức hiệu lực
      currentDebt: balance,
      availableCredit,
      creditUsagePercent: Math.round(creditUsagePercent * 100) / 100,
      isOverLimit: balance > creditLimit,
      bypassCreditLimit: customer.bypassCreditLimit || false,
      isBypassed,
      warningLevel: this.getCreditWarningLevel(creditUsagePercent, creditLimit, isBypassed, customer.type),
    };
  }

  private getCreditWarningLevel(usagePercent: number, creditLimit: number = 0, isBypassed: boolean = false, customerType?: string): 'safe' | 'warning' | 'danger' | 'overlimit' | 'unlocked' {
    // Khách nội bộ không hiển thị cảnh báo
    if (customerType === 'INTERNAL') {
      return 'safe';
    }

    // Khách thường (EXTERNAL) - nếu bypass thì "được mở chặn"
    if (isBypassed) {
      return 'unlocked';
    }

    // Khách thường - không có hạn mức mà không bypass → vượt hạn
    if (creditLimit === 0) {
      return 'overlimit';
    }

    // Logic bình thường
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

  // ============ CREDIT LIMIT MANAGEMENT ============

  /**
   * Lấy danh sách hạn mức của khách hàng tại các cửa hàng
   */
  async getStoreCreditLimits(customerId: number) {
    const customer = await this.customerRepository.findOne({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException(`Khách hàng #${customerId} không tồn tại`);
    }

    // Lấy TẤT CẢ stores trong hệ thống
    const allStores = await this.storeRepository.find({
      order: { id: 'ASC' },
    });

    // Lấy customer_stores hiện có
    const customerStores = await this.customerStoreRepository.find({
      where: { customerId },
    });

    // Map để tra cứu nhanh
    const customerStoreMap = new Map(
      customerStores.map(cs => [cs.storeId, cs])
    );

    // Tạo storeLimits cho TẤT CẢ stores
    const storeLimits = await Promise.all(
      allStores.map(async (store) => {
        const cs = customerStoreMap.get(store.id);
        const debtBalance = await this.getDebtBalance(customerId, store.id);
        const creditLimit = cs?.creditLimit ?? null;
        const effectiveLimit = creditLimit ?? customer.creditLimit ?? 0;
        const currentDebt = debtBalance.balance;
        const availableCredit = Math.max(0, effectiveLimit - currentDebt);

        // Check bypass status - sửa logic để nhất quán
        const now = new Date();
        // Còn hiệu lực khi: bypassUntil NULL (vô thời hạn) HOẶC bypassUntil > now (chưa hết hạn)
        const storeBypassActive = cs?.bypassCreditLimit && (!cs?.bypassUntil || cs.bypassUntil > now);
        const globalBypassActive = customer.bypassCreditLimit && (!customer.bypassUntil || customer.bypassUntil > now);

        return {
          customerId,
          customerName: customer.name,
          customerCode: customer.code,
          storeId: store.id,
          storeName: store.name,
          creditLimit, // Hạn mức riêng (null nếu chưa set)
          defaultCreditLimit: customer.creditLimit, // Hạn mức mặc định
          effectiveLimit, // Hạn mức hiệu lực
          currentDebt,
          availableCredit,
          creditUsagePercent: effectiveLimit > 0 ? (currentDebt / effectiveLimit) * 100 : 0,
          isOverLimit: currentDebt > effectiveLimit,
          // Bypass info
          bypassCreditLimit: cs?.bypassCreditLimit ?? false,
          bypassUntil: cs?.bypassUntil ?? null,
          isBypassed: storeBypassActive || globalBypassActive,
          bypassLevel: storeBypassActive ? 'store' : (globalBypassActive ? 'global' : 'none'),
        };
      })
    );

    return {
      customerId,
      customerName: customer.name,
      customerCode: customer.code,
      defaultCreditLimit: customer.creditLimit,
      // Global bypass info
      bypassCreditLimit: customer.bypassCreditLimit ?? false,
      bypassUntil: customer.bypassUntil ?? null,
      storeLimits,
    };
  }

  /**
   * Cập nhật hạn mức của khách hàng tại một cửa hàng
   */
  async updateStoreCreditLimit(
    customerId: number,
    storeId: number,
    dto: UpdateStoreCreditLimitDto
  ) {
    // Validate customer exists
    const customer = await this.customerRepository.findOne({
      where: { id: customerId },
    });
    if (!customer) {
      throw new NotFoundException(`Khách hàng #${customerId} không tồn tại`);
    }

    // Validate store exists
    const store = await this.storeRepository.findOne({
      where: { id: storeId },
    });
    if (!store) {
      throw new NotFoundException(`Cửa hàng #${storeId} không tồn tại`);
    }

    // Find or create customer_store record
    let customerStore = await this.customerStoreRepository.findOne({
      where: { customerId, storeId },
    });

    if (!customerStore) {
      // Tạo mới nếu chưa có
      customerStore = this.customerStoreRepository.create({
        customerId,
        storeId,
        creditLimit: dto.creditLimit ?? null,
        bypassCreditLimit: dto.bypassCreditLimit ?? false,
        bypassUntil: dto.bypassUntil ? new Date(dto.bypassUntil) : null,
      });
    } else {
      // Update existing
      if (dto.creditLimit !== undefined) {
        customerStore.creditLimit = dto.creditLimit ?? null;
      }
      if (dto.bypassCreditLimit !== undefined) {
        customerStore.bypassCreditLimit = dto.bypassCreditLimit;
      }
      if (dto.bypassUntil !== undefined) {
        customerStore.bypassUntil = dto.bypassUntil ? new Date(dto.bypassUntil) : null;
      }
    }

    await this.customerStoreRepository.save(customerStore);

    // Return updated info
    return this.getStoreCreditLimits(customerId);
  }

  /**
   * Xóa liên kết khách hàng - cửa hàng
   * Chỉ cho phép xóa nếu chưa có giao dịch nào
   */
  async removeCustomerFromStore(customerId: number, storeId: number) {
    // Validate customer exists
    const customer = await this.customerRepository.findOne({
      where: { id: customerId },
    });
    if (!customer) {
      throw new NotFoundException(`Khách hàng #${customerId} không tồn tại`);
    }

    // Validate store exists
    const store = await this.storeRepository.findOne({
      where: { id: storeId },
    });
    if (!store) {
      throw new NotFoundException(`Cửa hàng #${storeId} không tồn tại`);
    }

    // Check if customer_store exists
    const customerStore = await this.customerStoreRepository.findOne({
      where: { customerId, storeId },
    });

    if (!customerStore) {
      throw new NotFoundException(
        `Khách hàng #${customerId} chưa được liên kết với cửa hàng #${storeId}`
      );
    }

    // Check if there are any transactions (debt_ledger)
    const debtCount = await this.debtLedgerRepository.count({
      where: { customerId, storeId },
    });

    if (debtCount > 0) {
      throw new BadRequestException(
        `Không thể xóa liên kết. Khách hàng đã có ${debtCount} giao dịch tại cửa hàng này. Vui lòng liên hệ quản trị viên.`
      );
    }

    // Check if there are any sales
    const salesCount = await this.saleRepository.count({
      where: { customerId, storeId },
    });

    if (salesCount > 0) {
      throw new BadRequestException(
        `Không thể xóa liên kết. Khách hàng đã có ${salesCount} đơn hàng tại cửa hàng này. Vui lòng liên hệ quản trị viên.`
      );
    }

    // Delete the association
    await this.customerStoreRepository.delete({ customerId, storeId });

    return {
      message: 'Xóa liên kết khách hàng - cửa hàng thành công',
      customerId,
      storeId,
      customerName: customer.name,
      storeName: store.name,
    };
  }

  /**
   * Lấy hạn mức hiệu lực của khách hàng tại một cửa hàng
   */
  async getEffectiveCreditLimit(customerId: number, storeId: number): Promise<number> {
    const customerStore = await this.customerStoreRepository.findOne({
      where: { customerId, storeId },
    });

    // Ưu tiên hạn mức riêng của store
    if (customerStore?.creditLimit !== null && customerStore?.creditLimit !== undefined) {
      return customerStore.creditLimit;
    }

    // Fallback về hạn mức mặc định của customer
    const customer = await this.customerRepository.findOne({
      where: { id: customerId },
    });

    return customer?.creditLimit ?? 0;
  }

  /**
   * Kiểm tra xem khách hàng có được bypass hạn mức không
   * Ưu tiên: 1. Bypass theo cửa hàng, 2. Bypass toàn bộ (ở customer)
   */
  async checkBypassCreditLimit(customerId: number, storeId: number): Promise<{
    isBypassed: boolean;
    bypassLevel: 'none' | 'store' | 'global';
    bypassUntil: Date | null;
    isExpired: boolean;
  }> {
    const now = new Date();

    // 1. Check bypass theo cửa hàng (ưu tiên cao hơn)
    const customerStore = await this.customerStoreRepository.findOne({
      where: { customerId, storeId },
    });

    if (customerStore?.bypassCreditLimit) {
      // Sửa: dùng <= để nhất quán - hết hạn khi bypassUntil <= now
      const isExpired = customerStore.bypassUntil ? customerStore.bypassUntil <= now : false;
      if (!isExpired) {
        return {
          isBypassed: true,
          bypassLevel: 'store',
          bypassUntil: customerStore.bypassUntil,
          isExpired: false,
        };
      }
      // Bypass đã hết hạn, tự động tắt
      await this.customerStoreRepository.update(
        { customerId, storeId },
        { bypassCreditLimit: false, bypassUntil: null }
      );
    }

    // 2. Check bypass toàn bộ (ở customer)
    const customer = await this.customerRepository.findOne({
      where: { id: customerId },
    });

    if (customer?.bypassCreditLimit) {
      // Sửa: dùng <= để nhất quán
      const isExpired = customer.bypassUntil ? customer.bypassUntil <= now : false;
      if (!isExpired) {
        return {
          isBypassed: true,
          bypassLevel: 'global',
          bypassUntil: customer.bypassUntil,
          isExpired: false,
        };
      }
      // Bypass đã hết hạn, tự động tắt
      await this.customerRepository.update(customerId, {
        bypassCreditLimit: false,
        bypassUntil: null,
      });
    }

    return {
      isBypassed: false,
      bypassLevel: 'none',
      bypassUntil: null,
      isExpired: false,
    };
  }

  /**
   * Toggle bypass hạn mức cho customer (áp dụng tất cả cửa hàng)
   */
  async toggleCustomerBypass(customerId: number, dto: ToggleCustomerBypassDto) {
    const customer = await this.customerRepository.findOne({
      where: { id: customerId },
    });
    if (!customer) {
      throw new NotFoundException(`Khách hàng #${customerId} không tồn tại`);
    }

    await this.customerRepository.update(customerId, {
      bypassCreditLimit: dto.bypassCreditLimit,
      bypassUntil: dto.bypassUntil ? new Date(dto.bypassUntil) : null,
    });

    return this.customerRepository.findOne({ where: { id: customerId } });
  }

  /**
   * Toggle bypass hạn mức cho customer tại một cửa hàng cụ thể
   */
  async toggleStoreBypass(
    customerId: number,
    storeId: number,
    bypassCreditLimit: boolean,
    bypassUntil?: string | null
  ) {
    // Validate
    const customer = await this.customerRepository.findOne({
      where: { id: customerId },
    });
    if (!customer) {
      throw new NotFoundException(`Khách hàng #${customerId} không tồn tại`);
    }

    const store = await this.storeRepository.findOne({
      where: { id: storeId },
    });
    if (!store) {
      throw new NotFoundException(`Cửa hàng #${storeId} không tồn tại`);
    }

    // Find or create customer_store
    let customerStore = await this.customerStoreRepository.findOne({
      where: { customerId, storeId },
    });

    if (!customerStore) {
      customerStore = this.customerStoreRepository.create({
        customerId,
        storeId,
        creditLimit: null,
        bypassCreditLimit,
        bypassUntil: bypassUntil ? new Date(bypassUntil) : null,
      });
    } else {
      customerStore.bypassCreditLimit = bypassCreditLimit;
      customerStore.bypassUntil = bypassUntil ? new Date(bypassUntil) : null;
    }

    await this.customerStoreRepository.save(customerStore);

    return this.getStoreCreditLimits(customerId);
  }

  /**
   * Validate xem debt mới có vượt hạn mức không
   * Bao gồm check bypass
   */
  async validateDebtLimit(customerId: number, storeId: number, newDebtAmount: number) {
    // 1. Kiểm tra bypass trước
    const bypassStatus = await this.checkBypassCreditLimit(customerId, storeId);

    // Lấy nợ hiện tại
    const currentBalance = await this.getDebtBalance(customerId, storeId);
    const currentDebt = currentBalance.balance;

    // Lấy hạn mức hiệu lực
    const creditLimit = await this.getEffectiveCreditLimit(customerId, storeId);

    // Tính tổng nợ sau khi thêm mới
    const totalDebt = currentDebt + newDebtAmount;

    // Nếu đang được bypass, luôn cho phép (nhưng vẫn trả về thông tin để cảnh báo)
    if (bypassStatus.isBypassed) {
      return {
        isValid: true,
        isBypassed: true,
        bypassLevel: bypassStatus.bypassLevel,
        bypassUntil: bypassStatus.bypassUntil,
        customerId,
        storeId,
        creditLimit,
        currentDebt,
        newDebtAmount,
        totalDebt,
        exceedAmount: totalDebt > creditLimit ? totalDebt - creditLimit : 0,
        message: `Đang được mở chặn (${bypassStatus.bypassLevel === 'global' ? 'toàn bộ' : 'theo cửa hàng'})${bypassStatus.bypassUntil ? ` đến ${new Date(bypassStatus.bypassUntil).toLocaleString('vi-VN')}` : ''}`,
      };
    }

    const isValid = totalDebt <= creditLimit;

    return {
      isValid,
      isBypassed: false,
      bypassLevel: 'none',
      bypassUntil: null,
      customerId,
      storeId,
      creditLimit,
      currentDebt,
      newDebtAmount,
      totalDebt,
      exceedAmount: isValid ? 0 : totalDebt - creditLimit,
      message: isValid
        ? 'Trong hạn mức'
        : `Vượt hạn mức ${(totalDebt - creditLimit).toLocaleString('vi-VN')}đ`,
    };
  }

  /**
   * Nhập số dư đầu kỳ công nợ cho cửa hàng
   * Mỗi cửa hàng nhập riêng số dư đầu kỳ của khách hàng tại cửa hàng đó
   */
  async importOpeningBalance(dto: ImportOpeningBalanceDto): Promise<ImportOpeningBalanceResponseDto> {
    const { storeId, transactionDate, items } = dto;

    // Kiểm tra store tồn tại
    const store = await this.storeRepository.findOne({ where: { id: storeId } });
    if (!store) {
      throw new NotFoundException(`Cửa hàng ${storeId} không tồn tại`);
    }

    const errors: { row: number; customerCode: string; message: string }[] = [];
    const debtLedgerIds: number[] = [];
    let successCount = 0;
    let failedCount = 0;

    // Sử dụng transaction để đảm bảo tính nhất quán
    await this.dataSource.transaction(async (manager) => {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const rowNumber = i + 2; // Row 1 là header, bắt đầu từ row 2

        try {
          // 1. Tìm khách hàng theo code
          const customer = await manager.findOne(Customer, {
            where: { code: item.customerCode },
          });

          if (!customer) {
            errors.push({
              row: rowNumber,
              customerCode: item.customerCode,
              message: `Không tìm thấy khách hàng với mã ${item.customerCode}`,
            });
            failedCount++;
            continue;
          }

          // 2. Kiểm tra khách hàng có liên kết với cửa hàng không
          let customerStore = await manager.findOne(CustomerStore, {
            where: { customerId: customer.id, storeId },
          });

          // Nếu chưa có liên kết, tự động tạo mới
          if (!customerStore) {
            customerStore = new CustomerStore();
            customerStore.customerId = customer.id;
            customerStore.storeId = storeId;
            await manager.save(customerStore);
          }

          // 3. Bỏ qua kiểm tra số dư bằng 0 (cho phép nhập 0)
          // Số dư có thể là 0, dương, hoặc âm

          // 4. Tạo record vào debt_ledger
          const debtLedger = new DebtLedger();
          debtLedger.customerId = customer.id;
          debtLedger.storeId = storeId;
          debtLedger.refType = 'OPENING_BALANCE';
          // Dương = khách nợ (debit), âm = khách được nợ (credit)
          if (item.openingBalance > 0) {
            debtLedger.debit = item.openingBalance;
            debtLedger.credit = 0;
          } else {
            debtLedger.debit = 0;
            debtLedger.credit = Math.abs(item.openingBalance);
          }
          debtLedger.notes = item.description || 'Số dư đầu kỳ công nợ';
          debtLedger.ledgerAt = new Date(transactionDate); // ⏰ Set ledgerAt cho báo cáo
          debtLedger.createdAt = new Date(transactionDate);

          const savedLedger = await manager.save(debtLedger);
          debtLedgerIds.push(savedLedger.id);
          successCount++;
        } catch (error) {
          errors.push({
            row: rowNumber,
            customerCode: item.customerCode,
            message: error.message || 'Lỗi không xác định',
          });
          failedCount++;
        }
      }
    });

    return {
      success: successCount,
      failed: failedCount,
      errors,
      debtLedgerIds,
    };
  }

  /**
   * Lấy danh sách các bản ghi Opening Balance đã nhập
   */
  async getOpeningBalanceRecords(storeId?: number) {
    const queryBuilder = this.debtLedgerRepository
      .createQueryBuilder('dl')
      .leftJoinAndSelect('dl.customer', 'c')
      .leftJoinAndSelect('dl.store', 's')
      .where('dl.ref_type = :refType', { refType: 'OPENING_BALANCE' })
      .orderBy('dl.created_at', 'DESC');

    if (storeId) {
      queryBuilder.andWhere('dl.store_id = :storeId', { storeId });
    }

    const records = await queryBuilder.getMany();

    return records.map((record) => ({
      id: record.id,
      customerId: record.customerId,
      customerCode: record.customer?.code,
      customerName: record.customer?.name,
      storeId: record.storeId,
      storeName: record.store?.name,
      // Dương = khách nợ (debit), âm = khách được nợ (credit)
      balance: Number(record.debit) - Number(record.credit),
      notes: record.notes,
      createdAt: record.createdAt,
    }));
  }

  /**
   * Cập nhật số dư đầu kỳ
   */
  async updateOpeningBalance(id: number, newBalance: number, notes?: string, createdAt?: string) {
    const record = await this.debtLedgerRepository.findOne({
      where: { id, refType: 'OPENING_BALANCE' },
    });

    if (!record) {
      throw new NotFoundException('Không tìm thấy bản ghi số dư đầu kỳ');
    }

    // Cho phép số dư bằng 0 (đã thanh toán hết nợ)
    // Dương = khách nợ (debit), âm = khách được nợ (credit), 0 = không nợ
    if (newBalance > 0) {
      record.debit = newBalance;
      record.credit = 0;
    } else if (newBalance < 0) {
      record.debit = 0;
      record.credit = Math.abs(newBalance);
    } else {
      record.debit = 0;
      record.credit = 0;
    }
    if (notes !== undefined) {
      record.notes = notes;
    }
    if (createdAt !== undefined) {
      record.createdAt = new Date(createdAt);
    }

    await this.debtLedgerRepository.save(record);

    return {
      message: 'Cập nhật số dư đầu kỳ thành công',
      id: record.id,
      newBalance,
    };
  }

  /**
   * Xóa bản ghi số dư đầu kỳ
   * Chỉ cho phép xóa nếu chưa có giao dịch khác
   */
  async deleteOpeningBalance(id: number) {
    const record = await this.debtLedgerRepository.findOne({
      where: { id, refType: 'OPENING_BALANCE' },
      relations: ['customer', 'store'],
    });

    if (!record) {
      throw new NotFoundException('Không tìm thấy bản ghi số dư đầu kỳ');
    }

    // Kiểm tra xem có giao dịch khác ngoài OPENING_BALANCE không
    const otherTransactions = await this.debtLedgerRepository.count({
      where: {
        customerId: record.customerId,
        storeId: record.storeId,
        refType: Not('OPENING_BALANCE'),
      },
    });

    if (otherTransactions > 0) {
      throw new BadRequestException(
        `Không thể xóa số dư đầu kỳ. Khách hàng đã có ${otherTransactions} giao dịch khác tại cửa hàng này.`
      );
    }

    // Xóa bản ghi
    await this.debtLedgerRepository.delete(id);

    return {
      message: 'Xóa số dư đầu kỳ thành công',
      id,
      customerName: record.customer?.name,
      storeName: record.store?.name,
      deletedBalance: Number(record.debit) - Number(record.credit),
    };
  }
}

