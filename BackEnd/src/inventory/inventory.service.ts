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
        const savedWarehouse =
          await this.warehouseRepository.save(newWarehouse);
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

  async getInventoryReport(
    warehouseId: number,
    fromDate?: string,
    toDate?: string,
    priceId?: number,
  ) {
    // Parse dates - proper format conversion
    let fromStr = '1970-01-01';
    let toStr = new Date().toISOString().split('T')[0];

    if (fromDate) {
      fromStr = fromDate.includes('T') ? fromDate.split('T')[0] : fromDate;
    }
    if (toDate) {
      toStr = toDate.includes('T') ? toDate.split('T')[0] : toDate;
    }

    // 1. Opening = ADJUSTMENT before fromDate
    const openingBalances = await this.dataSource.query(
      `SELECT il.product_id as "productId", p.name, p.code, p.unit,
        SUM(il.quantity_in - il.quantity_out) as "balance"
      FROM inventory_ledger il
      LEFT JOIN products p ON p.id = il.product_id
      WHERE il.warehouse_id = $1 AND DATE(il.created_at) < $2::date AND il.shift_id IS NULL
      GROUP BY il.product_id, p.name, p.code, p.unit`,
      [warehouseId, fromStr],
    );

    // 2. Period = all movements from fromDate to toDate
    const periods = await this.dataSource.query(
      `SELECT il.product_id as "productId",
        SUM(il.quantity_in) as "in",
        SUM(il.quantity_out) as "out"
      FROM inventory_ledger il
      WHERE il.warehouse_id = $1
        AND DATE(il.created_at) >= $2::date
        AND DATE(il.created_at) <= $3::date
      GROUP BY il.product_id`,
      [warehouseId, fromStr, toStr],
    );

    // 3. Closing = all movements up to toDate (ADJUSTMENT + latest per shift)
    const closings = await this.dataSource.query(
      `SELECT il.product_id as "productId",
        SUM(il.quantity_in - il.quantity_out) as "balance"
      FROM inventory_ledger il
      WHERE il.warehouse_id = $1
        AND DATE(il.created_at) <= $2::date
        AND (il.shift_id IS NULL OR il.id IN (
          SELECT DISTINCT ON(shift_id, product_id) id
          FROM inventory_ledger
          WHERE shift_id IS NOT NULL AND warehouse_id = $1 AND DATE(created_at) <= $2::date
          ORDER BY shift_id, product_id, created_at DESC
        ))
      GROUP BY il.product_id`,
      [warehouseId, toStr],
    );

    // Merge results
    const pIds = new Set([
      ...openingBalances.map((x: any) => x.productId),
      ...periods.map((x: any) => x.productId),
      ...closings.map((x: any) => x.productId),
    ]);

    const result: any[] = [];
    for (const pid of pIds) {
      const o = openingBalances.find((x: any) => x.productId === pid);
      const p = periods.find((x: any) => x.productId === pid);
      const c = closings.find((x: any) => x.productId === pid);

      result.push({
        productId: pid,
        productCode: o?.code,
        productName: o?.name,
        unitName: o?.unit,
        openingBalance: o ? Number(o.balance) : 0,
        importQuantity: p ? Number(p.in) : 0,
        exportQuantity: p ? Number(p.out) : 0,
        closingBalance: c ? Number(c.balance) : 0,
      });
    }
    return result;
  }

  /**
   * 🔥 Báo cáo nhập xuất tồn THEO BỂ (Tank-based)
   * Ưu tiên: Nếu có kỳ chốt trước fromDate → Tồn đầu = Tồn cuối kỳ chốt đó
   * Nếu không có kỳ chốt → Tính từ current_stock + ledger trước fromDate
   */
  async getInventoryReportByTank(
    storeId: number,
    fromDate?: string,
    toDate?: string,
  ) {
    console.log('📊 getInventoryReportByTank called:', {
      storeId,
      fromDate,
      toDate,
    });

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
        console.log(
          `🔍 Tank ${tank.tankCode}: Tìm kỳ chốt với tankId=${tank.id}, storeId=${storeId}, fromDate='${fromDateStr}'`,
        );

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

        console.log(
          `🔍 Tank ${tank.tankCode}: lastClosing =`,
          lastClosing
            ? `id=${lastClosing.id}, periodFrom=${lastClosing.periodFrom}, periodTo=${lastClosing.periodTo}, openingBalance=${lastClosing.openingBalance}, closingBalance=${lastClosing.closingBalance}`
            : 'NULL',
        );

        if (lastClosing) {
          const periodFromDate =
            typeof lastClosing.periodFrom === 'string'
              ? new Date(lastClosing.periodFrom)
              : lastClosing.periodFrom;
          const periodToDate =
            typeof lastClosing.periodTo === 'string'
              ? new Date(lastClosing.periodTo)
              : lastClosing.periodTo;

          const fromDateOnly = new Date(fromDateStr);

          // Normalize tất cả dates để so sánh chính xác
          periodFromDate.setHours(0, 0, 0, 0);
          periodToDate.setHours(0, 0, 0, 0);
          fromDateOnly.setHours(0, 0, 0, 0);

          console.log(
            `🔍 Tank ${tank.tankCode}: So sánh dates - fromDateOnly=${fromDateOnly.toISOString()}, periodFrom=${periodFromDate.toISOString()}, periodTo=${periodToDate.toISOString()}`,
          );

          if (fromDateOnly.getTime() > periodToDate.getTime()) {
            // ✅ Case 1: fromDate SAU kỳ chốt → Tồn đầu = Tồn cuối kỳ chốt + ledger từ sau kỳ chốt đến trước fromDate
            const closingBalance = Number(lastClosing.closingBalance);
            const dayAfterClosing = new Date(periodToDate);
            dayAfterClosing.setDate(dayAfterClosing.getDate() + 1);
            dayAfterClosing.setHours(0, 0, 0, 0);

            const ledgerAfterClosingResult =
              await this.inventoryLedgerRepository
                .createQueryBuilder('il')
                .select(
                  'COALESCE(SUM(il.quantityIn - il.quantityOut), 0)',
                  'balance',
                )
                .where('il.warehouseId = :warehouseId', {
                  warehouseId: warehouse.id,
                })
                .andWhere('il.tankId = :tankId', { tankId: tank.id })
                .andWhere('il.createdAt >= :dayAfterClosing', {
                  dayAfterClosing,
                })
                .andWhere('il.createdAt < :fromDate', {
                  fromDate: fromDateTime,
                })
                .getRawOne();

            openingBalance =
              closingBalance + Number(ledgerAfterClosingResult?.balance || 0);
            usedClosingPeriod = true;
            console.log(
              `🔒 Tank ${tank.tankCode}: [SAU KỲ CHỐT] closingBalance=${closingBalance}, ledgerAfter=${ledgerAfterClosingResult?.balance || 0}, openingBalance=${openingBalance}`,
            );
          } else if (fromDateOnly.getTime() === periodToDate.getTime()) {
            // ✅ Case 2: fromDate = ngày cuối kỳ chốt → Tồn đầu = Tồn cuối kỳ chốt (đã bao gồm tất cả ledger và hao hụt)
            openingBalance = Number(lastClosing.closingBalance);
            usedClosingPeriod = true;
            console.log(
              `🔒 Tank ${tank.tankCode}: [ĐÚNG NGÀY CUỐI KỲ] closingBalance=${openingBalance}`,
            );
          } else if (
            fromDateOnly.getTime() >= periodFromDate.getTime() &&
            fromDateOnly.getTime() < periodToDate.getTime()
          ) {
            // ✅ Case 3: fromDate TRONG kỳ chốt (không phải ngày cuối) → Tồn đầu = openingBalance + ledger từ periodFrom đến trước fromDate
            const periodOpeningBalance = Number(lastClosing.openingBalance);

            console.log(
              `🔍 Tank ${tank.tankCode}: [TRONG KỲ CHỐT] Query ledger từ ${periodFromDate.toISOString()} đến ${fromDateTime.toISOString()}`,
            );

            const ledgerInPeriodResult = await this.inventoryLedgerRepository
              .createQueryBuilder('il')
              .leftJoin('il.shift', 's')
              .select(
                'COALESCE(SUM(il.quantityIn - il.quantityOut), 0)',
                'balance',
              )
              .addSelect('COALESCE(SUM(il.quantityIn), 0)', 'totalIn')
              .addSelect('COALESCE(SUM(il.quantityOut), 0)', 'totalOut')
              .addSelect('COUNT(*)', 'count')
              .where('il.warehouseId = :warehouseId', {
                warehouseId: warehouse.id,
              })
              .andWhere('il.tankId = :tankId', { tankId: tank.id })
              .andWhere(
                '(s.openedAt IS NOT NULL AND s.openedAt >= :periodFrom AND s.openedAt < :fromDate) OR (s.openedAt IS NULL AND il.createdAt >= :periodFrom AND il.createdAt < :fromDate)',
                { periodFrom: periodFromDate, fromDate: fromDateTime },
              )
              .getRawOne();

            console.log(
              `🔍 Tank ${tank.tankCode}: ledgerInPeriodResult =`,
              ledgerInPeriodResult,
            );

            openingBalance =
              periodOpeningBalance + Number(ledgerInPeriodResult?.balance || 0);
            usedClosingPeriod = true;
            console.log(
              `🔒 Tank ${tank.tankCode}: [TRONG KỲ CHỐT] periodOpeningBalance=${periodOpeningBalance}, ledgerInPeriod=${ledgerInPeriodResult?.balance || 0}, openingBalance=${openingBalance}`,
            );
          }
        }

        if (!usedClosingPeriod) {
          const ledgerBeforeResult = await this.inventoryLedgerRepository
            .createQueryBuilder('il')
            .leftJoin('il.shift', 's')
            .select(
              'COALESCE(SUM(il.quantityIn - il.quantityOut), 0)',
              'balance',
            )
            .where('il.warehouseId = :warehouseId', {
              warehouseId: warehouse.id,
            })
            .andWhere('il.tankId = :tankId', { tankId: tank.id })
            .andWhere(
              '(s.openedAt IS NOT NULL AND s.openedAt < :fromDate) OR (s.openedAt IS NULL AND il.createdAt < :fromDate)',
              { fromDate: fromDateTime },
            )
            .getRawOne();
          openingBalance = Number(ledgerBeforeResult?.balance || 0);
          console.log(
            `📦 Tank ${tank.tankCode}: Không có kỳ chốt, tính từ ledger (bao gồm ADJUSTMENT). ledgerBefore=${ledgerBeforeResult?.balance || 0}, openingBalance=${openingBalance}`,
          );
        }
      }

      // 2. Period movements (tổng nhập/xuất trong kỳ)
      // 🔥 TRIỆT ĐỂ FIX: Dùng raw SQL để tránh LEFT JOIN tạo lặp hàng
      let fromDateStr = '';
      let toDateStr = '';
      const importParams: any[] = [warehouse.id, tank.id];
      let paramIndex = 3;

      if (fromDate) {
        const fromDateTime = new Date(fromDate + 'T00:00:00');
        fromDateStr = `AND (COALESCE(s.opened_at, il.created_at) >= $${paramIndex})`;
        importParams.push(fromDateTime);
        paramIndex++;
      }

      if (toDate) {
        const toDateTime = new Date(toDate + 'T23:59:59.999');
        toDateStr = `AND (COALESCE(s.opened_at, il.created_at) <= $${paramIndex})`;
        importParams.push(toDateTime);
        paramIndex++;
      }

      const importResult = await this.dataSource.query(
        `
        SELECT COALESCE(SUM(il.quantity_in), 0) as "totalIn"
        FROM inventory_ledger il
        LEFT JOIN shifts s ON s.id = il.shift_id
        WHERE il.warehouse_id = $1
          AND il.tank_id = $2
          AND (il.ref_type = 'IMPORT' OR il.ref_type = 'ADJUSTMENT')
          ${fromDateStr}
          ${toDateStr}
        `,
        importParams,
      );

      // Query XUẤT - raw SQL
      const exportParams: any[] = [warehouse.id, tank.id];
      let exportParamIndex = 3;
      let exportFromDateStr = '';
      let exportToDateStr = '';

      if (fromDate) {
        const fromDateTime = new Date(fromDate + 'T00:00:00');
        exportFromDateStr = `AND (COALESCE(s.opened_at, il.created_at) >= $${exportParamIndex})`;
        exportParams.push(fromDateTime);
        exportParamIndex++;
      }

      if (toDate) {
        const toDateTime = new Date(toDate + 'T23:59:59.999');
        exportToDateStr = `AND (COALESCE(s.opened_at, il.created_at) <= $${exportParamIndex})`;
        exportParams.push(toDateTime);
        exportParamIndex++;
      }

      const exportResult = await this.dataSource.query(
        `
        SELECT COALESCE(SUM(il.quantity_out), 0) as "totalOut"
        FROM inventory_ledger il
        LEFT JOIN shifts s ON s.id = il.shift_id
        WHERE il.warehouse_id = $1
          AND il.tank_id = $2
          ${exportFromDateStr}
          ${exportToDateStr}
        `,
        exportParams,
      );

      console.log(
        `📊 Tank ${tank.tankCode} - import:`,
        importResult,
        'export:',
        exportResult,
      );
      const importQuantity = Number(importResult?.[0]?.totalIn || 0);
      const exportQuantity = Number(exportResult?.[0]?.totalOut || 0);

      // 3. Closing Balance = openingBalance + import - export
      // 🔥 FIX: Closing balance được tính từ opening balance + import - export
      // KHÔNG tính lại từ tất cả ledger (vì điều đó sẽ bao gồm ADJUSTMENT 2 lần)
      const closingBalance = openingBalance + importQuantity - exportQuantity;

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
  async getInventoryReportByTankWithPeriods(
    storeId: number,
    fromDate?: string,
    toDate?: string,
  ) {
    console.log('📊 getInventoryReportByTankWithPeriods called:', {
      storeId,
      fromDate,
      toDate,
    });

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

    // Parse dates - normalize về start/end of day
    const fromDateTime = fromDate ? new Date(fromDate + 'T00:00:00') : null;
    const toDateTime = toDate ? new Date(toDate + 'T23:59:59.999') : new Date();
    console.log('📅 Date range:', {
      fromDate,
      toDate,
      fromDateTime: fromDateTime?.toISOString(),
      toDateTime: toDateTime?.toISOString(),
    });

    // Lấy tất cả kỳ chốt trong khoảng thời gian (dựa trên tank đầu tiên làm reference)
    const closingPeriods = await this.inventoryClosingRepository
      .createQueryBuilder('ic')
      .select('ic.periodFrom', 'periodFrom')
      .addSelect('ic.periodTo', 'periodTo')
      .addSelect('MAX(ic.closingDate)', 'closingDate')
      .where('ic.storeId = :storeId', { storeId })
      .andWhere('ic.periodFrom <= :toDate', { toDate: toDateTime })
      .andWhere('ic.periodTo >= :fromDate', {
        fromDate: fromDateTime || new Date('1970-01-01'),
      })
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
            tanks,
            warehouse.id,
            storeId,
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
      const closedItems = await this.getClosedPeriodItems(
        storeId,
        closing.periodFrom,
        closing.periodTo,
      );
      periods.push({
        periodType: 'CLOSED',
        periodFrom: this.formatDateStr(closingFrom),
        periodTo: this.formatDateStr(closingTo),
        closingDate: closing.closingDate
          ? new Date(closing.closingDate).toISOString()
          : undefined,
        items: closedItems,
      });

      // Lưu kỳ chốt này làm reference cho kỳ mở tiếp theo
      lastClosedPeriod = {
        periodTo: closingTo,
        closingDate: closing.closingDate ? new Date(closing.closingDate) : null,
        closingBalances: closedItems.reduce(
          (acc, item) => {
            acc[item.tankId] = item.closingBalance;
            return acc;
          },
          {} as Record<number, number>,
        ),
      };

      // Di chuyển currentStart đến ngày sau kỳ chốt
      currentStart = new Date(closingTo);
      currentStart.setDate(currentStart.getDate() + 1);
      console.log(
        `📅 [getInventoryReportByTankWithPeriods] Moved currentStart after closing period: ${currentStart.toISOString()}`,
      );
    }

    // Nếu còn khoảng thời gian SAU tất cả kỳ chốt (kỳ mở)
    if (currentStart <= endDate) {
      console.log(
        `📅 [getInventoryReportByTankWithPeriods] Creating OPEN period AFTER closings: ${this.formatDateStr(currentStart)} to ${this.formatDateStr(endDate)}`,
      );
      const items = await this.calculatePeriodItems(
        tanks,
        warehouse.id,
        storeId,
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
        tanks,
        warehouse.id,
        storeId,
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
      tanks: tanks.map((t) => ({
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
   * Helper: Format date to YYYY-MM-DD (local timezone, không phải UTC!)
   */
  private formatDateStr(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Helper: Lấy dữ liệu kỳ đã chốt từ inventory_closing
   */
  private async getClosedPeriodItems(
    storeId: number,
    periodFrom: Date,
    periodTo: Date,
  ) {
    console.log(
      `📊 [getClosedPeriodItems] Fetching closed period: ${periodFrom} to ${periodTo}`,
    );
    const closings = await this.inventoryClosingRepository.find({
      where: {
        storeId,
        periodFrom: new Date(periodFrom),
        periodTo: new Date(periodTo),
      },
      relations: ['tank', 'tank.product'],
      order: { tankId: 'ASC' },
    });

    console.log(
      `📊 [getClosedPeriodItems] Found ${closings.length} closing records`,
    );
    if (closings.length > 0) {
      console.log(
        `📊 [getClosedPeriodItems] Sample - Tank ${closings[0].tank?.tankCode}: import=${closings[0].importQuantity}, export=${closings[0].exportQuantity}`,
      );
    }

    return closings.map((c) => ({
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
    // Parse dates - đảm bảo có timestamp
    const fromDateTime = new Date(
      fromDate.includes('T') ? fromDate : fromDate + 'T00:00:00',
    );
    const toDateTime = new Date(
      toDate.includes('T') ? toDate : toDate + 'T23:59:59.999',
    );
    console.log('🔍 [calculatePeriodItems] Date range:', {
      fromDate,
      toDate,
      fromDateTime: fromDateTime.toISOString(),
      toDateTime: toDateTime.toISOString(),
    });

    // 🔥 Xác định thời điểm bắt đầu tính ledger
    // QUAN TRỌNG: ledgerStartTime KHÔNG ĐƯỢC LÙI VỀ TRƯỚC fromDateTime
    let ledgerStartTime = fromDateTime;

    console.log(
      `🔍 [calculatePeriodItems] Input dates - fromDate: ${fromDate}, toDate: ${toDate}`,
    );
    console.log(
      `🔍 [calculatePeriodItems] Parsed dates - fromDateTime: ${fromDateTime.toISOString()}, toDateTime: ${toDateTime.toISOString()}`,
    );
    console.log(`🔍 [calculatePeriodItems] previousClosing:`, previousClosing);

    if (previousClosing?.closingDate) {
      const closingDateOnly = new Date(previousClosing.closingDate);
      closingDateOnly.setHours(0, 0, 0, 0);

      console.log(
        `🔍 [calculatePeriodItems] closingDate full: ${new Date(previousClosing.closingDate).toISOString()}`,
      );
      console.log(
        `🔍 [calculatePeriodItems] closingDateOnly (00:00): ${closingDateOnly.toISOString()}`,
      );
      console.log(
        `🔍 [calculatePeriodItems] fromDateTime (00:00): ${fromDateTime.toISOString()}`,
      );
      console.log(
        `🔍 [calculatePeriodItems] Comparison result: ${closingDateOnly.getTime()} === ${fromDateTime.getTime()} = ${closingDateOnly.getTime() === fromDateTime.getTime()}`,
      );

      // Chỉ dùng closingDate nếu nó NẰM TRONG khoảng fromDate đến toDate
      // Ví dụ: chốt lúc 01/01 16:55, kỳ mở từ 01/01 00:00 → ledger phải từ SAU 16:55 (trong cùng ngày)
      if (closingDateOnly.getTime() === fromDateTime.getTime()) {
        // closingDate cùng ngày với fromDate → dùng closingDate làm mốc
        ledgerStartTime = previousClosing.closingDate;
        console.log(
          `🔥 [calculatePeriodItems] Dùng closingDate làm mốc: ${ledgerStartTime.toISOString()}`,
        );
      } else {
        console.log(
          `🔥 [calculatePeriodItems] KHÔNG dùng closingDate (khác ngày), giữ fromDateTime: ${ledgerStartTime.toISOString()}`,
        );
      }
      // KHÔNG dùng closingDate nếu nó là ngày hôm trước (fromDate - 1)
      // Vì điều đó sẽ lấy cả dữ liệu ngày hôm trước
    }

    for (const tank of tanks) {
      // 🔥 current_stock trong bảng tank là giá trị ban đầu khi tạo bể hoặc khi chốt kỳ gần nhất
      const tankInitialStock = Number(tank.currentStock || 0);
      let openingBalance = 0;

      console.log(
        `\n🔷 [calculatePeriodItems] ========== Tank ${tank.tankCode} ==========`,
      );
      console.log(
        `🔷 tank.currentStock (giá trị ban đầu): ${tankInitialStock}`,
      );

      // 🔥 Nếu có thông tin kỳ chốt trước, dùng closingBalance trực tiếp
      if (
        previousClosing &&
        previousClosing.closingBalances[tank.id] !== undefined
      ) {
        openingBalance = previousClosing.closingBalances[tank.id];
        console.log(
          `✅ [calculatePeriodItems] Tank ${tank.tankCode}: Lấy tồn đầu từ kỳ chốt trước = ${openingBalance}`,
        );
      } else {
        // Không có kỳ chốt trước → tính từ tank.currentStock + ledger
        console.log(
          `🔍 [calculatePeriodItems] Tank ${tank.tankCode}: Không có kỳ chốt trước`,
        );
        console.log(
          `🔍 [calculatePeriodItems] fromDateTime: ${fromDateTime.toISOString()}`,
        );

        // 🔥 Tồn đầu kỳ = SUM(ADJUSTMENT + ledger TRƯỚC fromDate)
        // Dùng COALESCE(s.opened_at, il.created_at) để nhất quán với getInventoryReportByTank
        // → Ca mở trước fromDate nhưng đóng trong kỳ = thuộc về kỳ trước (không tính vào opening)
        const ledgerBeforeResultRaw = await this.dataSource.query(
          `
          SELECT COALESCE(SUM(il.quantity_in - il.quantity_out), 0) as "balance"
          FROM inventory_ledger il
          LEFT JOIN shifts s ON s.id = il.shift_id
          WHERE il.warehouse_id = $1
            AND il.tank_id = $2
            AND (COALESCE(s.opened_at, il.created_at) < $3::timestamp)
          `,
          [warehouseId, tank.id, fromDate + 'T00:00:00'],
        );

        const ledgerBeforeFrom = Number(
          ledgerBeforeResultRaw?.[0]?.balance || 0,
        );

        // Tồn đầu kỳ = Tất cả giao dịch trước kỳ (bao gồm ADJUSTMENT)
        openingBalance = ledgerBeforeFrom;

        console.log(
          `📦 [calculatePeriodItems] Tank ${tank.tankCode}: ledgerBeforeFrom=${ledgerBeforeFrom}, openingBalance=${openingBalance}`,
        );
      }

      // 🔥 Nhập trong kỳ - dùng COALESCE(s.opened_at, il.created_at) để nhất quán
      // → Ca mở trong kỳ tính vào kỳ này, dù đóng ca sau ngày cuối kỳ
      const importResultRaw = await this.dataSource.query(
        `
        SELECT COALESCE(SUM(il.quantity_in), 0) as "totalIn"
        FROM inventory_ledger il
        LEFT JOIN shifts s ON s.id = il.shift_id
        WHERE il.warehouse_id = $1
          AND il.tank_id = $2
          AND (il.ref_type = 'IMPORT' OR il.ref_type = 'ADJUSTMENT')
          AND (COALESCE(s.opened_at, il.created_at) >= $3::timestamp)
          AND (COALESCE(s.opened_at, il.created_at) <= $4::timestamp)
        `,
        [
          warehouseId,
          tank.id,
          fromDate + 'T00:00:00',
          toDate + 'T23:59:59.999',
        ],
      );

      // 🔥 Xuất trong kỳ - dùng COALESCE(s.opened_at, il.created_at) để nhất quán
      const exportResultRaw = await this.dataSource.query(
        `
        SELECT COALESCE(SUM(il.quantity_out), 0) as "totalOut"
        FROM inventory_ledger il
        LEFT JOIN shifts s ON s.id = il.shift_id
        WHERE il.warehouse_id = $1
          AND il.tank_id = $2
          AND il.ref_type != 'ADJUSTMENT'
          AND (COALESCE(s.opened_at, il.created_at) >= $3::timestamp)
          AND (COALESCE(s.opened_at, il.created_at) <= $4::timestamp)
        `,
        [
          warehouseId,
          tank.id,
          fromDate + 'T00:00:00',
          toDate + 'T23:59:59.999',
        ],
      );

      console.log(
        `📊 [calculatePeriodItems] Tank ${tank.tankCode}: fromDate=${fromDate}, toDate=${toDate}, import=${importResultRaw[0]?.totalIn}, export=${exportResultRaw[0]?.totalOut}, openingBalance=${openingBalance}`,
      );

      const importQuantity = Number(importResultRaw?.[0]?.totalIn || 0);
      const exportQuantity = Number(exportResultRaw?.[0]?.totalOut || 0);
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
  async getInventoryReportByStore(
    storeId: number,
    fromDate?: string,
    toDate?: string,
    priceId?: number,
  ) {
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

    const products =
      await this.stockCalculatorService.getWarehouseAllProductsStock(
        warehouse.id,
      );

    return {
      storeId,
      warehouseId: warehouse.id,
      reportDate: new Date(),
      products: products.map((p) => ({
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
   * 🔥 FIX: Tự động tìm tank của sản phẩm và ghi vào ledger với tankId chính xác
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
    const productIds = items.map((i) => i.productId);
    const products = await this.productRepository.findByIds(productIds);
    if (products.length !== productIds.length) {
      throw new BadRequestException('Một số sản phẩm không tồn tại');
    }

    // 3. Lấy tất cả tanks của store để map với products
    const tanks = await this.tankRepository.find({
      where: { storeId, isActive: true },
      relations: ['product'],
    });

    // 3. Thực hiện trong transaction
    return this.dataSource.transaction(async (manager) => {
      const adjustments: Array<{
        productId: number;
        productName?: string;
        tankId?: number;
        tankCode?: string;
        currentStock: number;
        targetStock: number;
        adjustment: number;
      }> = [];

      for (const item of items) {
        // 🔥 Tìm tank của sản phẩm này
        const tank = tanks.find((t) => t.productId === item.productId);

        if (!tank) {
          throw new BadRequestException(
            `Không tìm thấy bể chứa cho mặt hàng ID ${item.productId}. Vui lòng tạo bể trước khi nhập tồn đầu.`,
          );
        }

        // Lấy tồn hiện tại
        const currentStock =
          await this.stockCalculatorService.getTankCurrentStock(tank.id);

        const diff = item.quantity - currentStock;

        if (diff !== 0) {
          // Tạo ledger entry để điều chỉnh - 🔥 GHI CHÍNH XÁC tankId
          const ledger = manager.create(InventoryLedger, {
            warehouseId: warehouse.id,
            productId: item.productId,
            tankId: tank.id, // 🔥 FIX: GHI tankId vào ledger để báo cáo có thể lọc chính xác
            refType: 'ADJUSTMENT',
            refId: undefined,
            quantityIn: diff > 0 ? diff : 0,
            quantityOut: diff < 0 ? Math.abs(diff) : 0,
            createdAt: effectiveDate ? new Date(effectiveDate) : new Date(),
          });

          await manager.save(InventoryLedger, ledger);

          adjustments.push({
            productId: item.productId,
            productName: tank.product?.name,
            tankId: tank.id,
            tankCode: tank.tankCode,
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
    console.log(
      `[getDocuments] storeId=${storeId}, type=${type}, fromDate=${fromDate}, toDate=${toDate}`,
    );

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
      .andWhere('doc.doc_date BETWEEN :fromDate AND :toDate', {
        fromDate,
        toDate,
      })
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
        items:
          doc.items?.map((item) => ({
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
        totalVolume:
          compartments.reduce(
            (sum, c) => sum + Number(c.receivedVolume || 0),
            0,
          ) ||
          doc.items?.reduce(
            (sum, item) => sum + Number(item.quantity || 0),
            0,
          ) ||
          0,
        calculation: calculation
          ? {
              status:
                calculation.excessShortageVolume > 0
                  ? 'EXCESS'
                  : calculation.excessShortageVolume < 0
                    ? 'SHORTAGE'
                    : 'NORMAL',
              totalTruckVolume: Number(calculation.totalTruckVolume),
              totalReceivedVolume: Number(calculation.totalReceivedVolume),
              totalLossVolume: Number(calculation.totalLossVolume),
              allowedLossVolume: Number(calculation.allowedLossVolume),
              excessShortageVolume: Number(calculation.excessShortageVolume),
            }
          : null,
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
  async createDocumentWithTruck(
    createDto: CreateInventoryDocumentWithTruckDto,
  ) {
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
        const savedWarehouse =
          await this.warehouseRepository.save(newWarehouse);
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
          where: { id: compartment.productId },
        });

        if (!product) {
          throw new Error(`Product ${compartment.productId} not found`);
        }

        // Tính toán cho ngăn này
        const calculation =
          this.petroleumCalculationService.calculateCompartment({
            truckVolume: compartment.truckVolume || 0,
            truckTemperature: compartment.truckTemperature || 15,
            actualTemperature: compartment.actualTemperature || 15,
            productCode: product.code,
          });

        // Tính hao hụt
        const lossVolume =
          (compartment.truckVolume || 0) - (compartment.receivedVolume || 0);

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
        throw new Error(
          'No compartments to calculate. Please add at least one compartment.',
        );
      }

      const documentCalculation =
        this.petroleumCalculationService.calculateDocument(
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
        temperatureAdjustmentVolume:
          documentCalculation.temperatureAdjustmentVolume,
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
      calculation: calculation
        ? {
            expansionCoefficient: Number(calculation.expansionCoefficient),
            lossCoefficient: Number(calculation.lossCoefficient),
            totalTruckVolume: Number(calculation.totalTruckVolume),
            totalActualVolume: Number(calculation.totalActualVolume),
            totalReceivedVolume: Number(calculation.totalReceivedVolume),
            totalLossVolume: Number(calculation.totalLossVolume),
            allowedLossVolume: Number(calculation.allowedLossVolume),
            excessShortageVolume: Number(calculation.excessShortageVolume),
            temperatureAdjustmentVolume: Number(
              calculation.temperatureAdjustmentVolume,
            ),
            status:
              Number(calculation.excessShortageVolume) > 0
                ? 'EXCESS'
                : Number(calculation.excessShortageVolume) < 0
                  ? 'SHORTAGE'
                  : 'NORMAL',
            notes: calculation.notes,
          }
        : null,
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
          throw new Error(
            `Tank ${item.tankId} không tồn tại hoặc không thuộc cửa hàng ${initialStockDto.storeId}`,
          );
        }

        // Lấy tồn hiện tại
        const currentStock =
          await this.stockCalculatorService.getTankCurrentStock(item.tankId);

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
            quantityIn: adjustment > 0 ? adjustment : 0, // Tăng tồn
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
    const products =
      await this.stockCalculatorService.getWarehouseAllProductsStock(
        warehouse.id,
      );

    return {
      storeId,
      warehouseId: warehouse.id,
      reportDate: new Date(),
      products: products.map((p) => ({
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
   * 🔥 FIX: Tự động tìm tankId nếu không được cung cấp
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

      // 🔥 Lấy tất cả tanks của store để map với products
      const tanks = await manager.find(Tank, {
        where: { storeId, isActive: true },
        relations: ['product'],
      });

      // Xóa tất cả ledger cũ của warehouse với ref_type = 'ADJUSTMENT' và shift_id IS NULL
      await manager.query(
        `DELETE FROM inventory_ledger
         WHERE warehouse_id = $1
           AND ref_type = 'ADJUSTMENT'
           AND shift_id IS NULL`,
        [warehouse.id],
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
        // 🔥 Nếu tankId không có, tự động tìm tank của sản phẩm này
        let tankId = item.tankId;
        if (!tankId) {
          const tank = tanks.find((t) => t.productId === item.productId);
          if (!tank) {
            throw new BadRequestException(
              `Không tìm thấy bể chứa cho mặt hàng ID ${item.productId}`,
            );
          }
          tankId = tank.id;
        }

        const ledger = manager.create(InventoryLedger, {
          warehouseId: warehouse.id,
          productId: item.productId,
          tankId: tankId, // 🔥 Đảm bảo tankId được set
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
