import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Brackets, LessThan } from 'typeorm';
import { InventoryDocument } from '../entities/inventory-document.entity';
import { InventoryDocumentItem } from '../entities/inventory-document-item.entity';
import { InventoryLedger } from '../entities/inventory-ledger.entity';
import { Warehouse } from '../entities/warehouse.entity';
import { Tank } from '../entities/tank.entity';
import { InventoryTruckCompartment } from '../entities/inventory-truck-compartment.entity';
import { InventoryLossCalculation } from '../entities/inventory-loss-calculation.entity';
import { Product } from '../entities/product.entity';
import { InventoryClosing } from '../entities/inventory-closing.entity';
import { CreateInventoryDocumentDto } from './dto/create-inventory-document.dto';
import { CreateInventoryDocumentWithTruckDto } from './dto/create-inventory-document-with-truck.dto';
import { InitialStockDto } from './dto/initial-stock.dto';
import { SimpleInitialStockDto } from './dto/simple-initial-stock.dto';
import { PetroleumCalculationService } from './petroleum-calculation.service';
import { InventoryStockCalculatorService } from './inventory-stock-calculator.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(InventoryDocument)
    private inventoryDocumentRepository: Repository<InventoryDocument>,
    @InjectRepository(InventoryDocumentItem)
    private inventoryDocumentItemRepository: Repository<InventoryDocumentItem>,
    @InjectRepository(InventoryLedger)
    private inventoryLedgerRepository: Repository<InventoryLedger>,
    @InjectRepository(Warehouse)
    private warehouseRepository: Repository<Warehouse>,
    @InjectRepository(Tank)
    private tankRepository: Repository<Tank>,
    @InjectRepository(InventoryTruckCompartment)
    private truckCompartmentRepository: Repository<InventoryTruckCompartment>,
    @InjectRepository(InventoryLossCalculation)
    private lossCalculationRepository: Repository<InventoryLossCalculation>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(InventoryClosing)
    private inventoryClosingRepository: Repository<InventoryClosing>,
    private dataSource: DataSource,
    private petroleumCalculationService: PetroleumCalculationService,
    private stockCalculatorService: InventoryStockCalculatorService,
  ) {}

  async createDocument(createDto: CreateInventoryDocumentDto) {
    let warehouseId = createDto.warehouseId;
    if (!warehouseId && createDto.storeId) {
      const warehouse = await this.warehouseRepository.findOne({
        where: { storeId: createDto.storeId },
      });
      if (warehouse) {
        warehouseId = warehouse.id;
      } else {
        // Auto create warehouse for store if not exists
        const newWarehouse = this.warehouseRepository.create({
          storeId: createDto.storeId,
          type: 'STORE',
        });
        const savedWarehouse = await this.warehouseRepository.save(newWarehouse);
        warehouseId = savedWarehouse.id;
      }
    }

    if (!warehouseId) {
      throw new Error('Warehouse ID or Store ID is required');
    }

    return this.dataSource.transaction(async (manager) => {
      // 1. Tạo document
      const document = manager.create(InventoryDocument, {
        warehouseId: warehouseId,
        docType: createDto.docType,
        docDate: new Date(createDto.docDate),
        status: 'COMPLETED',
        supplierName: createDto.supplierName,
        invoiceNumber: createDto.invoiceNumber,
        licensePlate: createDto.licensePlate,
      });
      const savedDocument = await manager.save(InventoryDocument, document);

      // 2. Tạo items và ghi ledger
      for (const item of createDto.items) {
        const docItem = manager.create(InventoryDocumentItem, {
          documentId: savedDocument.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          tankId: item.tankId,
        });
        await manager.save(InventoryDocumentItem, docItem);

        // Ghi inventory ledger (SINGLE SOURCE OF TRUTH cho tồn kho)
        const isInbound = ['IMPORT', 'TRANSFER_IN'].includes(createDto.docType);
        const ledger = manager.create(InventoryLedger, {
          warehouseId: warehouseId,
          productId: item.productId,
          refType: createDto.docType,
          refId: savedDocument.id,
          quantityIn: isInbound ? item.quantity : 0,
          quantityOut: isInbound ? 0 : item.quantity,
          tankId: item.tankId,
        });
        await manager.save(InventoryLedger, ledger);

        // BỎ: Không cập nhật currentStock nữa
        // Tồn kho được tính từ InventoryLedger: SUM(quantityIn - quantityOut)
      }

      return savedDocument;
    });
  }

  async getInventoryBalance(warehouseId: number, productId?: number) {
    const query = this.inventoryLedgerRepository
      .createQueryBuilder('il')
      .select('il.product_id', 'productId')
      .addSelect('SUM(il.quantity_in - il.quantity_out)', 'balance')
      .where('il.warehouse_id = :warehouseId', { warehouseId })
      .groupBy('il.product_id');

    if (productId) {
      query.andWhere('il.product_id = :productId', { productId });
    }

    return query.getRawMany();
  }

  async getInventoryReport(warehouseId: number, fromDate?: string, toDate?: string, priceId?: number) {
    console.log('📊 getInventoryReport called:', { warehouseId, fromDate, toDate, priceId });

    // ✅ FIX: Sử dụng raw SQL để lấy chỉ ID của bản ghi mới nhất
    // DISTINCT ON trong PostgreSQL chỉ lấy bản ghi đầu tiên trong mỗi nhóm
    const latestLedgerIdsQuery = `
      SELECT DISTINCT ON (shift_id, product_id) id
      FROM inventory_ledger
      WHERE shift_id IS NOT NULL
        AND warehouse_id = $1
      ORDER BY shift_id, product_id, created_at DESC
    `;

    // Nếu có filter theo kỳ giá, lấy productId và price từ kỳ giá đó
    let priceFilter: { productId: number; price: number } | null = null;
    if (priceId) {
      const priceResult = await this.dataSource.query(
        `SELECT product_id as "productId", price FROM product_prices WHERE id = $1`,
        [priceId],
      );
      if (priceResult && priceResult.length > 0) {
        priceFilter = priceResult[0];
        console.log('💰 Price filter applied:', priceFilter);
      }
    }
    // 1. Get Opening Balance (Before fromDate)
    // Bao gồm tất cả giao dịch (kể cả ADJUSTMENT) trước kỳ báo cáo
    const openingQuery = this.dataSource
      .createQueryBuilder()
      .select('il.product_id', 'productId')
      .addSelect('p.name', 'productName')
      .addSelect('p.code', 'productCode')
      .addSelect('p.unit', 'unitName')
      .addSelect('SUM(il.quantity_in - il.quantity_out)', 'openingBalance')
      .from((qb) => {
        return qb
          .select('*')
          .from('inventory_ledger', 'il_all')
          .where('il_all.warehouse_id = :warehouseId', { warehouseId })
          .andWhere(
            new Brackets((qb) => {
              qb.where('il_all.shift_id IS NULL') // Ledger không liên quan shift (nhập hàng, điều chỉnh)
                .orWhere(`il_all.id IN (${latestLedgerIdsQuery})`); // Hoặc là bản ghi mới nhất của shift
            })
          );
      }, 'il')
      .leftJoin('products', 'p', 'p.id = il.product_id')
      .groupBy('il.product_id, p.name, p.code, p.unit')
      .setParameter('warehouseId', warehouseId);

    // Filter theo kỳ giá nếu có
    if (priceFilter) {
      openingQuery.andWhere('il.product_id = :productId', { productId: priceFilter.productId });
    }

    if (fromDate) {
      const fromDateTime = new Date(fromDate);
      console.log('📅 Opening balance query: before', fromDateTime);
      openingQuery.andWhere('il.created_at < :fromDate', { fromDate: fromDateTime });
    } else {
      // Nếu không có fromDate, tồn đầu = 0
      openingQuery.andWhere('1=0');
    }

    const openingBalances = await openingQuery.getRawMany();
    console.log('📈 Opening balances:', openingBalances);

    // 2. Get In/Out during period
    // ✅ CHỈ lấy bản ghi mới nhất cho mỗi shift
    const periodQuery = this.dataSource
      .createQueryBuilder()
      .select('il.product_id', 'productId')
      .addSelect('SUM(il.quantity_in)', 'totalIn')
      .addSelect('SUM(il.quantity_out)', 'totalOut')
      .from((qb) => {
        return qb
          .select('*')
          .from('inventory_ledger', 'il_all')
          .where('il_all.warehouse_id = :warehouseId', { warehouseId })
          .andWhere(
            new Brackets((qb) => {
              qb.where('il_all.shift_id IS NULL')
                .orWhere(`il_all.id IN (${latestLedgerIdsQuery})`);
            })
          );
      }, 'il')
      .groupBy('il.product_id')
      .setParameter('warehouseId', warehouseId);

    // Filter theo kỳ giá nếu có
    if (priceFilter) {
      periodQuery.andWhere('il.product_id = :productId', { productId: priceFilter.productId });
    }

    if (fromDate) {
      const fromDateTime = new Date(fromDate);
      console.log('📅 Period query: from', fromDateTime);
      periodQuery.andWhere('il.created_at >= :fromDate', { fromDate: fromDateTime });
    }
    if (toDate) {
      // Add 1 day to include the end date fully
      const nextDay = new Date(toDate);
      nextDay.setDate(nextDay.getDate() + 1);
      console.log('📅 Period query: to', nextDay);
      periodQuery.andWhere('il.created_at < :toDate', { toDate: nextDay });
    }

    const periodMovements = await periodQuery.getRawMany();
    console.log('📊 Period movements:', periodMovements);

    // 3. Get Closing Balance (All transactions up to toDate)
    const closingQuery = this.dataSource
      .createQueryBuilder()
      .select('il.product_id', 'productId')
      .addSelect('SUM(il.quantity_in - il.quantity_out)', 'closingBalance')
      .from((qb) => {
        return qb
          .select('*')
          .from('inventory_ledger', 'il_all')
          .where('il_all.warehouse_id = :warehouseId', { warehouseId })
          .andWhere(
            new Brackets((qb) => {
              qb.where('il_all.shift_id IS NULL')
                .orWhere(`il_all.id IN (${latestLedgerIdsQuery})`);
            })
          );
      }, 'il')
      .groupBy('il.product_id')
      .setParameter('warehouseId', warehouseId);

    // Filter theo kỳ giá nếu có
    if (priceFilter) {
      closingQuery.andWhere('il.product_id = :productId', { productId: priceFilter.productId });
    }

    if (toDate) {
      const nextDay = new Date(toDate);
      nextDay.setDate(nextDay.getDate() + 1);
      closingQuery.andWhere('il.created_at < :toDate', { toDate: nextDay });
    }

    const closingBalances = await closingQuery.getRawMany();
    console.log('📉 Closing balances:', closingBalances);

    // 4. Merge results
    // Get all unique product IDs
    const productIds = new Set([
      ...openingBalances.map((i) => i.productId),
      ...periodMovements.map((i) => i.productId),
      ...closingBalances.map((i) => i.productId),
    ]);

    const report: any[] = [];
    for (const pid of productIds) {
      const open = openingBalances.find((i) => i.productId === pid);
      const move = periodMovements.find((i) => i.productId === pid);
      const close = closingBalances.find((i) => i.productId === pid);

      const openingQty = open ? Number(open.openingBalance) : 0;
      const inQty = move ? Number(move.totalIn) : 0;
      const outQty = move ? Number(move.totalOut) : 0;
      const closingQty = close ? Number(close.closingBalance) : 0;

      // We need product details if they weren't in opening balance
      let productName = open?.productName;
      let productCode = open?.productCode;
      let unitName = open?.unitName;

      if (!productName) {
        // Fetch product details if missing (e.g. new product imported in period)
        const product = await this.dataSource.query(
          `SELECT p.name as "productName", p.code as "productCode", p.unit as "unitName"
           FROM products p
           WHERE p.id = $1`,
          [pid],
        );
        if (product && product.length > 0) {
          productName = product[0].productName;
          productCode = product[0].productCode;
          unitName = product[0].unitName;
        }
      }

      report.push({
        productId: pid,
        productCode,
        productName,
        unitName,
        openingBalance: openingQty,
        importQuantity: inQty,
        exportQuantity: outQty,
        closingBalance: closingQty,
      });
    }

    return report;
  }

  /**
   * 🔥 Báo cáo nhập xuất tồn THEO BỂ (Tank-based)
   * Ưu tiên: Nếu có kỳ chốt trước fromDate → Tồn đầu = Tồn cuối kỳ chốt đó
   * Nếu không có kỳ chốt → Tính từ current_stock + ledger trước fromDate
   */
  async getInventoryReportByTank(storeId: number, fromDate?: string, toDate?: string) {
    console.log('📊 getInventoryReportByTank called:', { storeId, fromDate, toDate });

    const warehouse = await this.warehouseRepository.findOne({
      where: { storeId, type: 'STORE' },
    });

    if (!warehouse) {
      throw new NotFoundException(`Không tìm thấy kho cho cửa hàng ${storeId}`);
    }

    // Lấy tất cả tank của store
    const tanks = await this.tankRepository.find({
      where: { storeId, isActive: true },
      relations: ['product'],
      order: { tankCode: 'ASC' },
    });

    if (!tanks || tanks.length === 0) {
      return [];
    }

    const report: any[] = [];

    for (const tank of tanks) {
      // ✅ Lấy current_stock từ tank (tồn ban đầu được setup)
      const initialStock = Number(tank.currentStock || 0);

      // 1. Opening Balance - Ưu tiên từ kỳ chốt
      let openingBalance = initialStock;
      let usedClosingPeriod = false;

      if (fromDate) {
        const fromDateTime = new Date(fromDate);
        fromDateTime.setHours(0, 0, 0, 0); // Normalize to start of day

        // 🔥 Sử dụng date string YYYY-MM-DD để so sánh với column type DATE
        const fromDateStr = fromDate.split('T')[0]; // Lấy phần date từ ISO string
        console.log(`🔍 Tank ${tank.tankCode}: Tìm kỳ chốt với tankId=${tank.id}, storeId=${storeId}, fromDate='${fromDateStr}'`);

        // 🔥 Tìm kỳ chốt mà periodTo >= ngày trước fromDate (tức là kỳ đã bao gồm dữ liệu đến trước fromDate)
        // Logic: Nếu có kỳ chốt kết thúc ngày 31/01 và fromDate là 22/01,
        // thì kỳ đó đã chứa dữ liệu từ 01/01 đến 21/01
        // Ta cần tìm kỳ chốt có periodTo < fromDate (kỳ kết thúc TRƯỚC ngày bắt đầu báo cáo)
        // HOẶC kỳ chốt có periodFrom <= fromDate <= periodTo (fromDate nằm trong kỳ đã chốt)
        // => Trong trường hợp này, tồn đầu = tồn cuối kỳ trước (nếu có) + ledger từ periodFrom đến fromDate-1

        // Cách tiếp cận: Tìm kỳ chốt gần nhất mà periodFrom <= fromDate
        // Nếu fromDate nằm trong kỳ (periodFrom <= fromDate <= periodTo), thì tồn đầu = openingBalance của kỳ đó + ledger từ periodFrom đến fromDate-1
        // Nếu fromDate > periodTo, thì tồn đầu = closingBalance của kỳ đó + ledger từ periodTo+1 đến fromDate-1

        const lastClosing = await this.inventoryClosingRepository
          .createQueryBuilder('ic')
          .where('ic.tankId = :tankId', { tankId: tank.id })
          .andWhere('ic.storeId = :storeId', { storeId })
          .andWhere('ic.periodFrom <= :fromDateStr', { fromDateStr })
          .orderBy('ic.periodTo', 'DESC')
          .getOne();

        console.log(`🔍 Tank ${tank.tankCode}: lastClosing =`, lastClosing ? `id=${lastClosing.id}, periodFrom=${lastClosing.periodFrom}, periodTo=${lastClosing.periodTo}, openingBalance=${lastClosing.openingBalance}, closingBalance=${lastClosing.closingBalance}` : 'NULL');

        if (lastClosing) {
          const periodFromDate = typeof lastClosing.periodFrom === 'string'
            ? new Date(lastClosing.periodFrom)
            : lastClosing.periodFrom;
          const periodToDate = typeof lastClosing.periodTo === 'string'
            ? new Date(lastClosing.periodTo)
            : lastClosing.periodTo;

          const fromDateOnly = new Date(fromDateStr);

          // Normalize tất cả dates để so sánh chính xác
          periodFromDate.setHours(0, 0, 0, 0);
          periodToDate.setHours(0, 0, 0, 0);
          fromDateOnly.setHours(0, 0, 0, 0);

          console.log(`🔍 Tank ${tank.tankCode}: So sánh dates - fromDateOnly=${fromDateOnly.toISOString()}, periodFrom=${periodFromDate.toISOString()}, periodTo=${periodToDate.toISOString()}`);

          if (fromDateOnly.getTime() > periodToDate.getTime()) {
            // ✅ Case 1: fromDate SAU kỳ chốt → Tồn đầu = Tồn cuối kỳ chốt + ledger từ sau kỳ chốt đến trước fromDate
            const closingBalance = Number(lastClosing.closingBalance);
            const dayAfterClosing = new Date(periodToDate);
            dayAfterClosing.setDate(dayAfterClosing.getDate() + 1);
            dayAfterClosing.setHours(0, 0, 0, 0);

            const ledgerAfterClosingResult = await this.inventoryLedgerRepository
              .createQueryBuilder('il')
              .select('COALESCE(SUM(il.quantityIn - il.quantityOut), 0)', 'balance')
              .where('il.warehouseId = :warehouseId', { warehouseId: warehouse.id })
              .andWhere('il.tankId = :tankId', { tankId: tank.id })
              .andWhere('il.createdAt >= :dayAfterClosing', { dayAfterClosing })
              .andWhere('il.createdAt < :fromDate', { fromDate: fromDateTime })
              .getRawOne();

            openingBalance = closingBalance + Number(ledgerAfterClosingResult?.balance || 0);
            usedClosingPeriod = true;
            console.log(`🔒 Tank ${tank.tankCode}: [SAU KỲ CHỐT] closingBalance=${closingBalance}, ledgerAfter=${ledgerAfterClosingResult?.balance || 0}, openingBalance=${openingBalance}`);
          } else if (fromDateOnly.getTime() === periodToDate.getTime()) {
            // ✅ Case 2: fromDate = ngày cuối kỳ chốt → Tồn đầu = Tồn cuối kỳ chốt (đã bao gồm tất cả ledger và hao hụt)
            openingBalance = Number(lastClosing.closingBalance);
            usedClosingPeriod = true;
            console.log(`🔒 Tank ${tank.tankCode}: [ĐÚNG NGÀY CUỐI KỲ] closingBalance=${openingBalance}`);
          } else if (fromDateOnly.getTime() >= periodFromDate.getTime() && fromDateOnly.getTime() < periodToDate.getTime()) {
            // ✅ Case 3: fromDate TRONG kỳ chốt (không phải ngày cuối) → Tồn đầu = openingBalance + ledger từ periodFrom đến trước fromDate
            const periodOpeningBalance = Number(lastClosing.openingBalance);

            console.log(`🔍 Tank ${tank.tankCode}: [TRONG KỲ CHỐT] Query ledger từ ${periodFromDate.toISOString()} đến ${fromDateTime.toISOString()}`);

            const ledgerInPeriodResult = await this.inventoryLedgerRepository
              .createQueryBuilder('il')
              .select('COALESCE(SUM(il.quantityIn - il.quantityOut), 0)', 'balance')
              .addSelect('COALESCE(SUM(il.quantityIn), 0)', 'totalIn')
              .addSelect('COALESCE(SUM(il.quantityOut), 0)', 'totalOut')
              .addSelect('COUNT(*)', 'count')
              .where('il.warehouseId = :warehouseId', { warehouseId: warehouse.id })
              .andWhere('il.tankId = :tankId', { tankId: tank.id })
              .andWhere('il.createdAt >= :periodFrom', { periodFrom: periodFromDate })
              .andWhere('il.createdAt < :fromDate', { fromDate: fromDateTime })
              .getRawOne();

            console.log(`🔍 Tank ${tank.tankCode}: ledgerInPeriodResult =`, ledgerInPeriodResult);

            openingBalance = periodOpeningBalance + Number(ledgerInPeriodResult?.balance || 0);
            usedClosingPeriod = true;
            console.log(`🔒 Tank ${tank.tankCode}: [TRONG KỲ CHỐT] periodOpeningBalance=${periodOpeningBalance}, ledgerInPeriod=${ledgerInPeriodResult?.balance || 0}, openingBalance=${openingBalance}`);
          }
        }

        if (!usedClosingPeriod) {
          // ❌ Không có kỳ chốt phù hợp → Tính theo logic cũ
          const ledgerBeforeResult = await this.inventoryLedgerRepository
            .createQueryBuilder('il')
            .select('COALESCE(SUM(il.quantityIn - il.quantityOut), 0)', 'balance')
            .where('il.warehouseId = :warehouseId', { warehouseId: warehouse.id })
            .andWhere('il.tankId = :tankId', { tankId: tank.id })
            .andWhere('il.createdAt < :fromDate', { fromDate: fromDateTime })
            .getRawOne();
          openingBalance = initialStock + Number(ledgerBeforeResult?.balance || 0);
          console.log(`📦 Tank ${tank.tankCode}: Không có kỳ chốt, tính từ ledger. initialStock=${initialStock}, ledgerBefore=${ledgerBeforeResult?.balance || 0}, openingBalance=${openingBalance}`);
        }
      }

      // 2. Period movements (tổng nhập/xuất trong kỳ)
      const periodQueryBuilder = this.inventoryLedgerRepository
        .createQueryBuilder('il')
        .select('COALESCE(SUM(il.quantityIn), 0)', 'totalIn')
        .addSelect('COALESCE(SUM(il.quantityOut), 0)', 'totalOut')
        .where('il.warehouseId = :warehouseId', { warehouseId: warehouse.id })
        .andWhere('il.tankId = :tankId', { tankId: tank.id });

      if (fromDate) {
        periodQueryBuilder.andWhere('il.createdAt >= :fromDate', { fromDate: new Date(fromDate) });
      }
      if (toDate) {
        const nextDay = new Date(toDate);
        nextDay.setDate(nextDay.getDate() + 1);
        periodQueryBuilder.andWhere('il.createdAt < :toDate', { toDate: nextDay });
      }

      const periodResult = await periodQueryBuilder.getRawOne();
      const importQuantity = Number(periodResult?.totalIn || 0);
      const exportQuantity = Number(periodResult?.totalOut || 0);

      // 3. Closing Balance = current_stock + SUM(tất cả ledger đến hết toDate)
      let closingBalance = initialStock;
      if (toDate) {
        const nextDay = new Date(toDate);
        nextDay.setDate(nextDay.getDate() + 1);
        const ledgerToDateResult = await this.inventoryLedgerRepository
          .createQueryBuilder('il')
          .select('COALESCE(SUM(il.quantityIn - il.quantityOut), 0)', 'balance')
          .where('il.warehouseId = :warehouseId', { warehouseId: warehouse.id })
          .andWhere('il.tankId = :tankId', { tankId: tank.id })
          .andWhere('il.createdAt < :toDate', { toDate: nextDay })
          .getRawOne();
        closingBalance = initialStock + Number(ledgerToDateResult?.balance || 0);
      } else {
        // Nếu không có toDate, lấy tồn hiện tại = current_stock + tất cả ledger
        const allLedgerResult = await this.inventoryLedgerRepository
          .createQueryBuilder('il')
          .select('COALESCE(SUM(il.quantityIn - il.quantityOut), 0)', 'balance')
          .where('il.warehouseId = :warehouseId', { warehouseId: warehouse.id })
          .andWhere('il.tankId = :tankId', { tankId: tank.id })
          .getRawOne();
        closingBalance = initialStock + Number(allLedgerResult?.balance || 0);
      }

      report.push({
        tankId: tank.id,
        tankCode: tank.tankCode,
        tankName: tank.name,
        productId: tank.productId,
        productCode: tank.product?.code || '',
        productName: tank.product?.name || '',
        productCategory: tank.product?.category || null,
        unitName: 'lít',
        capacity: Number(tank.capacity),
        openingBalance,
        importQuantity,
        exportQuantity,
        closingBalance,
      });
    }

    return report;
  }

  /**
   * 🔥 NEW: Báo cáo nhập xuất tồn TÁCH THEO KỲ CHỐT
   * Trả về nhiều segments: kỳ đã chốt + kỳ chưa chốt
   */
  async getInventoryReportByTankWithPeriods(storeId: number, fromDate?: string, toDate?: string) {
    console.log('📊 getInventoryReportByTankWithPeriods called:', { storeId, fromDate, toDate });

    const warehouse = await this.warehouseRepository.findOne({
      where: { storeId, type: 'STORE' },
    });

    if (!warehouse) {
      throw new NotFoundException(`Không tìm thấy kho cho cửa hàng ${storeId}`);
    }

    const tanks = await this.tankRepository.find({
      where: { storeId, isActive: true },
      relations: ['product'],
      order: { tankCode: 'ASC' },
    });

    if (!tanks || tanks.length === 0) {
      return { periods: [], tanks: [] };
    }

    // Parse dates
    const fromDateTime = fromDate ? new Date(fromDate) : null;
    const toDateTime = toDate ? new Date(toDate) : new Date();
    if (fromDateTime) fromDateTime.setHours(0, 0, 0, 0);
    toDateTime.setHours(23, 59, 59, 999);

    // Lấy tất cả kỳ chốt trong khoảng thời gian (dựa trên tank đầu tiên làm reference)
    const closingPeriods = await this.inventoryClosingRepository
      .createQueryBuilder('ic')
      .select('ic.periodFrom', 'periodFrom')
      .addSelect('ic.periodTo', 'periodTo')
      .addSelect('MAX(ic.closingDate)', 'closingDate')
      .where('ic.storeId = :storeId', { storeId })
      .andWhere('ic.periodFrom <= :toDate', { toDate: toDateTime })
      .andWhere('ic.periodTo >= :fromDate', { fromDate: fromDateTime || new Date('1970-01-01') })
      .groupBy('ic.periodFrom')
      .addGroupBy('ic.periodTo')
      .orderBy('ic.periodFrom', 'ASC')
      .getRawMany();

    console.log('📅 Closing periods found:', closingPeriods);

    // Xây dựng danh sách periods (segments)
    const periods: Array<{
      periodType: 'CLOSED' | 'OPEN';
      periodFrom: string;
      periodTo: string;
      closingDate?: string;
      items: any[];
    }> = [];

    // Track kỳ chốt trước đó để truyền cho kỳ mở
    let lastClosedPeriod: {
      periodTo: Date;
      closingDate: Date | null;
      closingBalances: Record<number, number>; // tankId -> closingBalance
    } | null = null;

    let currentStart = fromDateTime || new Date('1970-01-01');
    const endDate = toDateTime;

    for (const closing of closingPeriods) {
      const closingFrom = new Date(closing.periodFrom);
      const closingTo = new Date(closing.periodTo);
      closingFrom.setHours(0, 0, 0, 0);
      closingTo.setHours(0, 0, 0, 0);

      // Nếu có khoảng trống TRƯỚC kỳ chốt (kỳ mở)
      if (currentStart < closingFrom) {
        const openPeriodEnd = new Date(closingFrom);
        openPeriodEnd.setDate(openPeriodEnd.getDate() - 1);

        if (openPeriodEnd >= currentStart) {
          const items = await this.calculatePeriodItems(
            tanks, warehouse.id, storeId,
            this.formatDateStr(currentStart),
            this.formatDateStr(openPeriodEnd),
            lastClosedPeriod, // Truyền kỳ chốt trước đó
          );
          periods.push({
            periodType: 'OPEN',
            periodFrom: this.formatDateStr(currentStart),
            periodTo: this.formatDateStr(openPeriodEnd),
            items,
          });
        }
      }

      // Kỳ chốt - lấy dữ liệu từ inventory_closing
      const closedItems = await this.getClosedPeriodItems(storeId, closing.periodFrom, closing.periodTo);
      periods.push({
        periodType: 'CLOSED',
        periodFrom: this.formatDateStr(closingFrom),
        periodTo: this.formatDateStr(closingTo),
        closingDate: closing.closingDate ? new Date(closing.closingDate).toISOString() : undefined,
        items: closedItems,
      });

      // Lưu kỳ chốt này làm reference cho kỳ mở tiếp theo
      lastClosedPeriod = {
        periodTo: closingTo,
        closingDate: closing.closingDate ? new Date(closing.closingDate) : null,
        closingBalances: closedItems.reduce((acc, item) => {
          acc[item.tankId] = item.closingBalance;
          return acc;
        }, {} as Record<number, number>),
      };

      // Di chuyển currentStart đến ngày sau kỳ chốt
      currentStart = new Date(closingTo);
      currentStart.setDate(currentStart.getDate() + 1);
    }

    // Nếu còn khoảng thời gian SAU tất cả kỳ chốt (kỳ mở)
    if (currentStart <= endDate) {
      const items = await this.calculatePeriodItems(
        tanks, warehouse.id, storeId,
        this.formatDateStr(currentStart),
        this.formatDateStr(endDate),
        lastClosedPeriod, // Truyền kỳ chốt cuối cùng
      );
      periods.push({
        periodType: 'OPEN',
        periodFrom: this.formatDateStr(currentStart),
        periodTo: this.formatDateStr(endDate),
        items,
      });
    }

    // Nếu không có kỳ chốt nào trong range, trả về 1 kỳ mở
    if (periods.length === 0 && fromDateTime && toDateTime) {
      const items = await this.calculatePeriodItems(
        tanks, warehouse.id, storeId,
        fromDate!,
        toDate!,
        null, // Không có kỳ chốt trước
      );
      periods.push({
        periodType: 'OPEN',
        periodFrom: fromDate!,
        periodTo: toDate!,
        items,
      });
    }

    return {
      periods,
      tanks: tanks.map(t => ({
        tankId: t.id,
        tankCode: t.tankCode,
        tankName: t.name,
        productId: t.productId,
        productName: t.product?.name || '',
        productCategory: t.product?.category || null,
        capacity: Number(t.capacity),
      })),
    };
  }

  /**
   * Helper: Format date to YYYY-MM-DD
   */
  private formatDateStr(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Helper: Lấy dữ liệu kỳ đã chốt từ inventory_closing
   */
  private async getClosedPeriodItems(storeId: number, periodFrom: Date, periodTo: Date) {
    const closings = await this.inventoryClosingRepository.find({
      where: {
        storeId,
        periodFrom: new Date(periodFrom),
        periodTo: new Date(periodTo),
      },
      relations: ['tank', 'tank.product'],
      order: { tankId: 'ASC' },
    });

    return closings.map(c => ({
      tankId: c.tankId,
      tankCode: c.tank?.tankCode || '',
      tankName: c.tank?.name || '',
      productId: c.tank?.productId || 0,
      productCode: c.tank?.product?.code || '',
      productName: c.tank?.product?.name || '',
      productCategory: c.productCategory || c.tank?.product?.category || null,
      unitName: 'lít',
      capacity: Number(c.tank?.capacity || 0),
      openingBalance: Number(c.openingBalance),
      importQuantity: Number(c.importQuantity),
      exportQuantity: Number(c.exportQuantity),
      lossRate: Number(c.lossRate),
      lossAmount: Number(c.lossAmount),
      closingBalance: Number(c.closingBalance),
    }));
  }

  /**
   * Helper: Tính dữ liệu cho kỳ mở (chưa chốt)
   * @param previousClosing - Thông tin kỳ chốt trước đó (nếu có)
   */
  private async calculatePeriodItems(
    tanks: Tank[],
    warehouseId: number,
    storeId: number,
    fromDate: string,
    toDate: string,
    previousClosing: {
      periodTo: Date;
      closingDate: Date | null;
      closingBalances: Record<number, number>;
    } | null,
  ) {
    const items: any[] = [];
    const fromDateTime = new Date(fromDate);
    fromDateTime.setHours(0, 0, 0, 0);
    const toDateTime = new Date(toDate);
    toDateTime.setHours(23, 59, 59, 999);

    // 🔥 Xác định thời điểm bắt đầu tính ledger
    // Nếu có kỳ chốt trước và closingDate trong ngày fromDate, dùng closingDate làm mốc
    let ledgerStartTime = fromDateTime;
    if (previousClosing?.closingDate) {
      const closingDateOnly = new Date(previousClosing.closingDate);
      closingDateOnly.setHours(0, 0, 0, 0);

      // Nếu closingDate cùng ngày với fromDate - 1, dùng closingDate làm mốc
      // Ví dụ: chốt lúc 22/01 16:55, kỳ mở từ 22/01, ledger phải từ SAU 16:55
      if (closingDateOnly.getTime() === fromDateTime.getTime() ||
          closingDateOnly.getTime() === fromDateTime.getTime() - 86400000) {
        ledgerStartTime = previousClosing.closingDate;
        console.log(`🔥 [calculatePeriodItems] Dùng closingDate làm mốc: ${ledgerStartTime.toISOString()}`);
      }
    }

    for (const tank of tanks) {
      const initialStock = Number(tank.currentStock || 0);
      let openingBalance = initialStock;

      // 🔥 Nếu có thông tin kỳ chốt trước, dùng closingBalance trực tiếp
      if (previousClosing && previousClosing.closingBalances[tank.id] !== undefined) {
        openingBalance = previousClosing.closingBalances[tank.id];
        console.log(`✅ [calculatePeriodItems] Tank ${tank.tankCode}: Lấy tồn đầu từ kỳ chốt trước = ${openingBalance}`);
      } else {
        // Không có kỳ chốt trước → tính từ ledger
        const fromDateStr = fromDate.split('T')[0];
        console.log(`🔍 [calculatePeriodItems] Tank ${tank.tankCode}: Không có kỳ chốt trước, tính từ ledger`);

        const ledgerBefore = await this.inventoryLedgerRepository
          .createQueryBuilder('il')
          .select('COALESCE(SUM(il.quantityIn - il.quantityOut), 0)', 'balance')
          .where('il.warehouseId = :warehouseId', { warehouseId })
          .andWhere('il.tankId = :tankId', { tankId: tank.id })
          .andWhere('il.createdAt < :fromDate', { fromDate: fromDateTime })
          .getRawOne();
        openingBalance = initialStock + Number(ledgerBefore?.balance || 0);
        console.log(`📦 [calculatePeriodItems] Tank ${tank.tankCode}: initialStock=${initialStock}, ledgerBefore=${ledgerBefore?.balance || 0}, openingBalance=${openingBalance}`);
      }

      // 🔥 Nhập/xuất trong kỳ - dùng ledgerStartTime làm mốc bắt đầu
      const nextDay = new Date(toDateTime);
      nextDay.setDate(nextDay.getDate() + 1);
      nextDay.setHours(0, 0, 0, 0);

      const periodResult = await this.inventoryLedgerRepository
        .createQueryBuilder('il')
        .select('COALESCE(SUM(il.quantityIn), 0)', 'totalIn')
        .addSelect('COALESCE(SUM(il.quantityOut), 0)', 'totalOut')
        .where('il.warehouseId = :warehouseId', { warehouseId })
        .andWhere('il.tankId = :tankId', { tankId: tank.id })
        .andWhere('il.createdAt >= :ledgerStartTime', { ledgerStartTime })
        .andWhere('il.createdAt < :toDate', { toDate: nextDay })
        .getRawOne();

      const importQuantity = Number(periodResult?.totalIn || 0);
      const exportQuantity = Number(periodResult?.totalOut || 0);
      const closingBalance = openingBalance + importQuantity - exportQuantity;

      items.push({
        tankId: tank.id,
        tankCode: tank.tankCode,
        tankName: tank.name,
        productId: tank.productId,
        productCode: tank.product?.code || '',
        productName: tank.product?.name || '',
        productCategory: tank.product?.category || null,
        unitName: 'lít',
        capacity: Number(tank.capacity),
        openingBalance,
        importQuantity,
        exportQuantity,
        lossRate: null, // Chưa chốt nên chưa tính hao hụt
        lossAmount: null,
        closingBalance,
      });
    }

    return items;
  }

  /**
   * Báo cáo nhập xuất tồn theo storeId (tự động tìm warehouse)
   */
  async getInventoryReportByStore(storeId: number, fromDate?: string, toDate?: string, priceId?: number) {
    const warehouse = await this.warehouseRepository.findOne({
      where: { storeId, type: 'STORE' },
    });

    if (!warehouse) {
      throw new NotFoundException(`Không tìm thấy kho cho cửa hàng ${storeId}`);
    }

    return this.getInventoryReport(warehouse.id, fromDate, toDate, priceId);
  }

  /**
   * Báo cáo tổng hợp tồn kho theo mặt hàng (không chi tiết tank)
   * Use case: Xem tổng tồn từng loại sản phẩm của cửa hàng
   */
  async getStockReportByProduct(storeId: number) {
    const warehouse = await this.warehouseRepository.findOne({
      where: { storeId, type: 'STORE' },
    });

    if (!warehouse) {
      throw new NotFoundException(`Không tìm thấy kho cho cửa hàng ${storeId}`);
    }

    const products = await this.stockCalculatorService.getWarehouseAllProductsStock(
      warehouse.id,
    );

    return {
      storeId,
      warehouseId: warehouse.id,
      reportDate: new Date(),
      products: products.map(p => ({
        productId: p.productId,
        productCode: p.productCode,
        productName: p.productName,
        totalStock: p.balance,
        unit: 'lít',
      })),
    };
  }

  /**
   * Nhập tồn đầu đơn giản: theo cửa hàng + mặt hàng
   * KHÔNG cần tankId
   */
  async setSimpleInitialStock(dto: SimpleInitialStockDto) {
    const { storeId, items, effectiveDate, notes } = dto;

    // 1. Lấy warehouse của cửa hàng
    let warehouse = await this.warehouseRepository.findOne({
      where: { storeId, type: 'STORE' },
    });

    if (!warehouse) {
      // Tự động tạo warehouse nếu chưa có
      warehouse = this.warehouseRepository.create({
        storeId,
        type: 'STORE',
      });
      warehouse = await this.warehouseRepository.save(warehouse);
    }

    // 2. Validate products
    const productIds = items.map(i => i.productId);
    const products = await this.productRepository.findByIds(productIds);
    if (products.length !== productIds.length) {
      throw new BadRequestException('Một số sản phẩm không tồn tại');
    }

    // 3. Thực hiện trong transaction
    return this.dataSource.transaction(async (manager) => {
      const adjustments: Array<{
        productId: number;
        currentStock: number;
        targetStock: number;
        adjustment: number;
      }> = [];

      for (const item of items) {
        // Lấy tồn hiện tại
        const currentStock = await this.stockCalculatorService.getWarehouseProductStock(
          warehouse.id,
          item.productId,
        );

        const diff = item.quantity - currentStock;

        if (diff !== 0) {
          // Tạo ledger entry để điều chỉnh
          const ledger = {
            warehouseId: warehouse.id,
            productId: item.productId,
            tankId: undefined, // ✅ KHÔNG cần tankId
            refType: 'ADJUSTMENT',
            refId: undefined,
            quantityIn: diff > 0 ? diff : 0,
            quantityOut: diff < 0 ? Math.abs(diff) : 0,
          };

          await manager.save(InventoryLedger, ledger);

          adjustments.push({
            productId: item.productId,
            currentStock,
            targetStock: item.quantity,
            adjustment: diff,
          });
        }
      }

      return {
        success: true,
        storeId,
        warehouseId: warehouse.id,
        adjustments,
        notes,
      };
    });
  }

  async getDocuments(
    storeId: number,
    type: string,
    fromDate: string,
    toDate: string,
  ) {
    console.log(`[getDocuments] storeId=${storeId}, type=${type}, fromDate=${fromDate}, toDate=${toDate}`);

    const warehouse = await this.warehouseRepository.findOne({
      where: { storeId, type: 'STORE' },
    });

    if (!warehouse) {
      console.log(`[getDocuments] No warehouse found for storeId=${storeId}`);
      return [];
    }

    console.log(`[getDocuments] Found warehouse id=${warehouse.id}`);

    const query = this.inventoryDocumentRepository
      .createQueryBuilder('doc')
      .leftJoinAndSelect('doc.items', 'item')
      .leftJoinAndSelect('item.product', 'product')
      .where('doc.warehouse_id = :warehouseId', { warehouseId: warehouse.id })
      .andWhere('doc.doc_date BETWEEN :fromDate AND :toDate', { fromDate, toDate })
      .orderBy('doc.doc_date', 'DESC')
      .addOrderBy('doc.id', 'DESC');

    if (type && type !== 'ALL' && type !== 'IMPORT' && type !== 'EXPORT') {
      query.andWhere('doc.doc_type = :type', { type });
    } else if (type === 'IMPORT') {
      query.andWhere("doc.doc_type IN ('IMPORT', 'IMPORT_WITH_TRUCK')");
    } else if (type === 'EXPORT') {
      query.andWhere("doc.doc_type = 'EXPORT'");
    }

    const documents = await query.getMany();
    console.log(`[getDocuments] Found ${documents.length} documents`);

    const result: any[] = [];
    for (const doc of documents) {
      for (const item of doc.items) {
        result.push({
          docDate: doc.docDate,
          docType: doc.docType,
          invoiceNumber: doc.invoiceNumber,
          supplierName: doc.supplierName,
          productCode: item.product?.code,
          productName: item.product?.name,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          amount: Math.round(Number(item.quantity) * Number(item.unitPrice)), // Làm tròn để tránh số lẻ thập phân
        });
      }
    }

    console.log(`[getDocuments] Returning ${result.length} items`);
    return result;
  }

  /**
   * Lấy danh sách phiếu nhập kho theo ca làm việc (với chi tiết xe téc)
   */
  async getDocumentsByShift(shiftId: number) {
    // Lấy tất cả documents có refShiftId = shiftId và docType = IMPORT
    const documents = await this.inventoryDocumentRepository.find({
      where: {
        refShiftId: shiftId,
        docType: 'IMPORT',
      },
      relations: ['items', 'items.product'],
      order: { docDate: 'DESC', id: 'DESC' },
    });

    const result: any[] = [];
    for (const doc of documents) {
      // Lấy thông tin compartments nếu là phiếu nhập xe téc
      const compartments = await this.truckCompartmentRepository.find({
        where: { documentId: doc.id },
        relations: ['product'],
        order: { compartmentNumber: 'ASC' },
      });

      // Lấy thông tin calculation
      const calculation = await this.lossCalculationRepository.findOne({
        where: { documentId: doc.id },
      });

      result.push({
        id: `doc_${doc.id}`,
        documentId: doc.id,
        docType: doc.docType,
        docDate: doc.docDate,
        docAt: doc.docAt,
        supplierName: doc.supplierName,
        invoiceNumber: doc.invoiceNumber,
        licensePlate: doc.licensePlate,
        // Trả về items từ document (format đơn giản)
        items: doc.items?.map((item) => ({
          productId: item.productId,
          productName: item.product?.name,
          tankId: item.tankId, // ✅ Thêm tankId
          quantity: Number(item.quantity),
        })) || [],
        compartments: compartments.map((c) => ({
          compartmentNumber: c.compartmentNumber,
          productId: c.productId,
          productName: c.product?.name,
          truckVolume: Number(c.truckVolume),
          receivedVolume: Number(c.receivedVolume),
          lossVolume: Number(c.lossVolume || 0),
        })),
        totalVolume: compartments.reduce((sum, c) => sum + Number(c.receivedVolume || 0), 0)
                     || doc.items?.reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 0,
        calculation: calculation ? {
          status: calculation.excessShortageVolume > 0 ? 'EXCESS' :
                  calculation.excessShortageVolume < 0 ? 'SHORTAGE' : 'NORMAL',
          totalTruckVolume: Number(calculation.totalTruckVolume),
          totalReceivedVolume: Number(calculation.totalReceivedVolume),
          totalLossVolume: Number(calculation.totalLossVolume),
          allowedLossVolume: Number(calculation.allowedLossVolume),
          excessShortageVolume: Number(calculation.excessShortageVolume),
        } : null,
      });
    }

    return result;
  }

  async getAllStoresInventory() {
    const warehouses = await this.warehouseRepository.find({
      where: { type: 'STORE' },
      relations: ['store'],
    });

    const result: any[] = [];
    for (const warehouse of warehouses) {
      const balances = await this.getInventoryBalance(warehouse.id);
      result.push({
        warehouse,
        balances,
      });
    }

    return result;
  }

  /**
   * Tạo phiếu nhập kho với xe téc và tính toán hao hụt
   */
  async createDocumentWithTruck(createDto: CreateInventoryDocumentWithTruckDto) {
    let warehouseId = createDto.warehouseId;
    if (!warehouseId && createDto.storeId) {
      const warehouse = await this.warehouseRepository.findOne({
        where: { storeId: createDto.storeId },
      });
      if (warehouse) {
        warehouseId = warehouse.id;
      } else {
        const newWarehouse = this.warehouseRepository.create({
          storeId: createDto.storeId,
          type: 'STORE',
        });
        const savedWarehouse = await this.warehouseRepository.save(newWarehouse);
        warehouseId = savedWarehouse.id;
      }
    }

    if (!warehouseId) {
      throw new Error('Warehouse ID or Store ID is required');
    }

    return this.dataSource.transaction(async (manager) => {
      // 1. Tạo document
      const document = manager.create(InventoryDocument, {
        warehouseId: warehouseId,
        docType: createDto.docType,
        docDate: new Date(createDto.docDate),
        status: 'COMPLETED',
        supplierName: createDto.supplierName,
        invoiceNumber: createDto.invoiceNumber,
        licensePlate: createDto.licensePlate,
        refShiftId: createDto.shiftId, // Lưu shift ID nếu có
      });
      const savedDocument = await manager.save(InventoryDocument, document);

      // 2. Lưu chi tiết từng ngăn xe téc và tính toán
      const compartmentCalculations: Array<{
        truckVolume: number;
        actualVolume: number;
        receivedVolume: number;
        productCode: string;
      }> = [];

      for (const compartment of createDto.compartments) {
        // Lấy thông tin sản phẩm
        const product = await manager.findOne(Product, {
          where: { id: compartment.productId }
        });

        if (!product) {
          throw new Error(`Product ${compartment.productId} not found`);
        }

        // Tính toán cho ngăn này
        const calculation = this.petroleumCalculationService.calculateCompartment({
          truckVolume: compartment.truckVolume || 0,
          truckTemperature: compartment.truckTemperature || 15,
          actualTemperature: compartment.actualTemperature || 15,
          productCode: product.code,
        });

        // Tính hao hụt
        const lossVolume = (compartment.truckVolume || 0) - (compartment.receivedVolume || 0);

        // Lưu vào database
        const truckCompartment = manager.create(InventoryTruckCompartment, {
          documentId: savedDocument.id,
          productId: compartment.productId,
          compartmentNumber: compartment.compartmentNumber,
          compartmentHeight: compartment.compartmentHeight,
          truckTemperature: compartment.truckTemperature,
          truckVolume: compartment.truckVolume,
          warehouseHeight: compartment.warehouseHeight,
          actualTemperature: compartment.actualTemperature,
          actualVolume: calculation.actualVolume,
          receivedVolume: compartment.receivedVolume,
          lossVolume: lossVolume,
          heightLossTruck: compartment.heightLossTruck,
          heightLossWarehouse: compartment.heightLossWarehouse,
        });
        await manager.save(InventoryTruckCompartment, truckCompartment);

        // Tạo inventory document item (để tương thích với hệ thống cũ)
        const docItem = manager.create(InventoryDocumentItem, {
          documentId: savedDocument.id,
          productId: compartment.productId,
          quantity: compartment.receivedVolume || 0,
          unitPrice: 0, // Sẽ cập nhật sau
        });
        await manager.save(InventoryDocumentItem, docItem);

        // Ghi inventory ledger
        const ledger = manager.create(InventoryLedger, {
          warehouseId: warehouseId,
          productId: compartment.productId,
          refType: createDto.docType,
          refId: savedDocument.id,
          quantityIn: compartment.receivedVolume || 0,
          quantityOut: 0,
        });
        await manager.save(InventoryLedger, ledger);

        compartmentCalculations.push({
          truckVolume: compartment.truckVolume || 0,
          actualVolume: calculation.actualVolume,
          receivedVolume: compartment.receivedVolume || 0,
          productCode: product.code,
        });
      }

      // 3. Tính toán tổng hợp cho toàn bộ phiếu
      // Kiểm tra compartmentCalculations có dữ liệu không
      if (!compartmentCalculations || compartmentCalculations.length === 0) {
        throw new Error('No compartments to calculate. Please add at least one compartment.');
      }

      const documentCalculation = this.petroleumCalculationService.calculateDocument(
        compartmentCalculations,
      );

      // 4. Lưu kết quả tính toán
      const lossCalculation = manager.create(InventoryLossCalculation, {
        documentId: savedDocument.id,
        expansionCoefficient: documentCalculation.expansionCoeff,
        lossCoefficient: documentCalculation.lossCoeff,
        totalTruckVolume: documentCalculation.totalTruckVolume,
        totalActualVolume: documentCalculation.totalActualVolume,
        totalReceivedVolume: documentCalculation.totalReceivedVolume,
        totalLossVolume: documentCalculation.totalLossVolume,
        allowedLossVolume: documentCalculation.allowedLossVolume,
        excessShortageVolume: documentCalculation.excessShortageVolume,
        temperatureAdjustmentVolume: documentCalculation.temperatureAdjustmentVolume,
        notes: createDto.notes,
      });
      await manager.save(InventoryLossCalculation, lossCalculation);

      return {
        document: savedDocument,
        calculation: documentCalculation,
      };
    });
  }

  /**
   * Lấy chi tiết phiếu nhập kho với xe téc
   */
  async getDocumentWithTruck(documentId: number) {
    const document = await this.inventoryDocumentRepository.findOne({
      where: { id: documentId },
      relations: ['warehouse', 'warehouse.store'],
    });

    if (!document) {
      throw new Error('Document not found');
    }

    // Lấy chi tiết các ngăn
    const compartments = await this.truckCompartmentRepository.find({
      where: { documentId },
      relations: ['product'],
      order: { compartmentNumber: 'ASC' },
    });

    // Lấy kết quả tính toán
    const calculation = await this.lossCalculationRepository.findOne({
      where: { documentId },
    });

    return {
      id: document.id,
      docDate: document.docDate,
      docType: document.docType,
      supplierName: document.supplierName,
      invoiceNumber: document.invoiceNumber,
      licensePlate: document.licensePlate,
      status: document.status,
      warehouse: {
        id: document.warehouse.id,
        type: document.warehouse.type,
        storeName: document.warehouse.store?.name || 'N/A',
      },
      compartments: compartments.map((c) => ({
        compartmentNumber: c.compartmentNumber,
        productName: c.product.name,
        productCode: c.product.code,
        truckVolume: Number(c.truckVolume || 0),
        actualVolume: Number(c.actualVolume || 0),
        receivedVolume: Number(c.receivedVolume || 0),
        lossVolume: Number(c.lossVolume || 0),
        truckTemperature: Number(c.truckTemperature || 0),
        actualTemperature: Number(c.actualTemperature || 0),
        compartmentHeight: Number(c.compartmentHeight || 0),
        warehouseHeight: Number(c.warehouseHeight || 0),
        heightLossTruck: Number(c.heightLossTruck || 0),
        heightLossWarehouse: Number(c.heightLossWarehouse || 0),
      })),
      calculation: calculation ? {
        expansionCoefficient: Number(calculation.expansionCoefficient),
        lossCoefficient: Number(calculation.lossCoefficient),
        totalTruckVolume: Number(calculation.totalTruckVolume),
        totalActualVolume: Number(calculation.totalActualVolume),
        totalReceivedVolume: Number(calculation.totalReceivedVolume),
        totalLossVolume: Number(calculation.totalLossVolume),
        allowedLossVolume: Number(calculation.allowedLossVolume),
        excessShortageVolume: Number(calculation.excessShortageVolume),
        temperatureAdjustmentVolume: Number(calculation.temperatureAdjustmentVolume),
        status: Number(calculation.excessShortageVolume) > 0
          ? 'EXCESS'
          : Number(calculation.excessShortageVolume) < 0
          ? 'SHORTAGE'
          : 'NORMAL',
        notes: calculation.notes,
      } : null,
    };
  }

  /**
   * Nhập tồn đầu kỳ cho cửa hàng
   * Dùng khi setup ban đầu hoặc điều chỉnh tồn kho
   */
  async setInitialStock(initialStockDto: InitialStockDto) {
    return this.dataSource.transaction(async (manager) => {
      // 1. Tìm hoặc tạo warehouse cho store
      let warehouse = await manager.findOne(Warehouse, {
        where: { storeId: initialStockDto.storeId, type: 'STORE' },
      });

      if (!warehouse) {
        warehouse = manager.create(Warehouse, {
          storeId: initialStockDto.storeId,
          type: 'STORE',
        });
        warehouse = await manager.save(Warehouse, warehouse);
      }

      // 2. Tạo document để truy vết
      const document = manager.create(InventoryDocument, {
        warehouseId: warehouse.id,
        docType: 'ADJUSTMENT', // Loại điều chỉnh/kiểm kê
        docDate: new Date(initialStockDto.effectiveDate),
        status: 'COMPLETED',
        supplierName: 'TỒN ĐẦU KỲ',
        invoiceNumber: `TON-DAU-${initialStockDto.storeId}-${new Date().getTime()}`,
      });
      const savedDocument = await manager.save(InventoryDocument, document);

      // 3. Ghi ledger cho từng tank
      for (const item of initialStockDto.items) {
        // Kiểm tra tank có tồn tại không
        const tank = await manager.findOne(Tank, {
          where: { id: item.tankId, storeId: initialStockDto.storeId },
        });

        if (!tank) {
          throw new Error(`Tank ${item.tankId} không tồn tại hoặc không thuộc cửa hàng ${initialStockDto.storeId}`);
        }

        // Lấy tồn hiện tại
        const currentStock = await this.stockCalculatorService.getTankCurrentStock(item.tankId);

        // Tính chênh lệch cần điều chỉnh
        const adjustment = item.quantity - currentStock;

        if (adjustment !== 0) {
          // Tạo document item
          const docItem = manager.create(InventoryDocumentItem, {
            documentId: savedDocument.id,
            productId: item.productId,
            tankId: item.tankId,
            quantity: Math.abs(adjustment),
            unitPrice: 0, // Không có giá cho tồn đầu
          });
          await manager.save(InventoryDocumentItem, docItem);

          // Ghi ledger
          const ledger = manager.create(InventoryLedger, {
            warehouseId: warehouse.id,
            productId: item.productId,
            tankId: item.tankId,
            refType: 'ADJUSTMENT',
            refId: savedDocument.id,
            quantityIn: adjustment > 0 ? adjustment : 0,   // Tăng tồn
            quantityOut: adjustment < 0 ? Math.abs(adjustment) : 0, // Giảm tồn
          });
          await manager.save(InventoryLedger, ledger);
        }
      }

      return {
        document: savedDocument,
        message: `Đã nhập tồn đầu kỳ cho ${initialStockDto.items.length} bể`,
      };
    });
  }

  /**
   * Lấy báo cáo tồn kho chi tiết theo bể
   */
  async getStockReportByTank(storeId: number) {
    const warehouse = await this.warehouseRepository.findOne({
      where: { storeId, type: 'STORE' },
    });

    if (!warehouse) {
      throw new NotFoundException(`Không tìm thấy kho cho cửa hàng ${storeId}`);
    }

    // Lấy tồn kho từ warehouse level (hỗ trợ cả có tank và không có tank)
    const products = await this.stockCalculatorService.getWarehouseAllProductsStock(
      warehouse.id,
    );

    return {
      storeId,
      warehouseId: warehouse.id,
      reportDate: new Date(),
      products: products.map(p => ({
        productId: p.productId,
        productCode: p.productCode,
        productName: p.productName,
        totalStock: p.balance,
        unit: 'lít',
      })),
    };
  }

  /**
   * Lấy danh sách bản ghi tồn đầu
   * Lấy từ inventory_ledger với ref_type = 'ADJUSTMENT' (đây là cách nhập tồn đầu)
   * Group theo warehouse_id vì mỗi cửa hàng chỉ có 1 bản ghi tồn đầu (gồm nhiều mặt hàng)
   */
  async getInitialStockRecords(storeId?: number) {
    const query = `
      SELECT
        w.store_id as "id",
        COALESCE(led.ref_id, 0) as "documentId",
        w.store_id as "storeId",
        s.name as "storeName",
        w.id as "warehouseId",
        MIN(led.created_at) as "effectiveDate",
        doc.supplier_name as "notes",
        MIN(led.created_at) as "createdAt",
        json_agg(
          json_build_object(
            'productId', led.product_id,
            'productCode', p.code,
            'productName', p.name,
            'quantity', led.quantity_in,
            'tankId', led.tank_id
          ) ORDER BY p.code
        ) as items
      FROM inventory_ledger led
      INNER JOIN warehouses w ON w.id = led.warehouse_id
      INNER JOIN stores s ON s.id = w.store_id
      LEFT JOIN inventory_documents doc ON doc.id = led.ref_id
      LEFT JOIN products p ON p.id = led.product_id
      WHERE led.ref_type = 'ADJUSTMENT'
        AND led.shift_id IS NULL
        ${storeId ? 'AND w.store_id = $1' : ''}
      GROUP BY w.store_id, s.name, w.id, led.ref_id, doc.supplier_name
      ORDER BY MIN(led.created_at) DESC, s.name
    `;

    const params = storeId ? [storeId] : [];
    const records = await this.dataSource.query(query, params);

    return records;
  }

  /**
   * Cập nhật tồn đầu kỳ
   */
  async updateInitialStock(dto: any) {
    const { documentId, storeId, items, notes, effectiveDate } = dto;

    return this.dataSource.transaction(async (manager) => {
      // Lấy warehouse của store
      const warehouse = await manager.findOne(Warehouse, {
        where: { storeId, type: 'STORE' },
      });

      if (!warehouse) {
        throw new NotFoundException(`Không tìm thấy kho cho cửa hàng`);
      }

      // Xóa tất cả ledger cũ của warehouse với ref_type = 'ADJUSTMENT' và shift_id IS NULL
      await manager.query(
        `DELETE FROM inventory_ledger
         WHERE warehouse_id = $1
           AND ref_type = 'ADJUSTMENT'
           AND shift_id IS NULL`,
        [warehouse.id]
      );

      // Tìm hoặc tạo document nếu cần
      let document: InventoryDocument | null = null;
      if (documentId && documentId > 0) {
        document = await manager.findOne(InventoryDocument, {
          where: { id: documentId },
        });
      }

      // Tạo lại ledger mới với ngày hiệu lực nếu có
      const ledgerDate = effectiveDate ? new Date(effectiveDate) : new Date();
      for (const item of items) {
        const ledger = manager.create(InventoryLedger, {
          warehouseId: warehouse.id,
          productId: item.productId,
          tankId: item.tankId,
          refType: 'ADJUSTMENT',
          refId: document?.id,
          quantityIn: item.quantity,
          quantityOut: 0,
          createdAt: ledgerDate,
        });
        await manager.save(InventoryLedger, ledger);
      }

      // Cập nhật notes và effectiveDate trong document nếu có
      if (document) {
        if (notes !== undefined) {
          document.supplierName = notes;
        }
        if (effectiveDate) {
          document.docDate = new Date(effectiveDate);
        }
        await manager.save(InventoryDocument, document);
      }

      return {
        message: 'Cập nhật tồn đầu thành công',
        documentId: document?.id || null,
      };
    });
  }

  /**
   * Xóa phiếu nhập/xuất kho cùng với tất cả dữ liệu liên quan
   * Dùng khi sửa ca - xóa phiếu cũ trước khi tạo phiếu mới
   */
  async deleteDocument(documentId: number) {
    return this.dataSource.transaction(async (manager) => {
      // Kiểm tra document tồn tại
      const document = await manager.findOne(InventoryDocument, {
        where: { id: documentId },
      });

      if (!document) {
        throw new NotFoundException(`Document #${documentId} không tồn tại`);
      }

      // 1. Xóa inventory_ledger liên quan
      await manager.delete(InventoryLedger, {
        refId: documentId,
      });

      // 2. Xóa truck compartments (cho phiếu nhập xe téc)
      await manager.delete(InventoryTruckCompartment, {
        documentId: documentId,
      });

      // 3. Xóa loss calculations (cho phiếu nhập xe téc)
      await manager.delete(InventoryLossCalculation, {
        documentId: documentId,
      });

      // 4. Xóa document items
      await manager.delete(InventoryDocumentItem, {
        documentId: documentId,
      });

      // 5. Xóa document chính
      await manager.delete(InventoryDocument, {
        id: documentId,
      });

      return {
        message: `Đã xóa phiếu #${documentId} thành công`,
        documentId,
      };
    });
  }
}
