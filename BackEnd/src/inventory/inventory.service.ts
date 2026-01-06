import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InventoryDocument } from '../entities/inventory-document.entity';
import { InventoryDocumentItem } from '../entities/inventory-document-item.entity';
import { InventoryLedger } from '../entities/inventory-ledger.entity';
import { Warehouse } from '../entities/warehouse.entity';
import { Tank } from '../entities/tank.entity';
import { InventoryTruckCompartment } from '../entities/inventory-truck-compartment.entity';
import { InventoryLossCalculation } from '../entities/inventory-loss-calculation.entity';
import { Product } from '../entities/product.entity';
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

  async getInventoryReport(warehouseId: number, fromDate?: string, toDate?: string) {
    console.log('📊 getInventoryReport called:', { warehouseId, fromDate, toDate });

    // 1. Get Opening Balance (Before fromDate)
    // Bao gồm tất cả giao dịch (kể cả ADJUSTMENT) trước kỳ báo cáo
    const openingQuery = this.inventoryLedgerRepository
      .createQueryBuilder('il')
      .select('il.product_id', 'productId')
      .addSelect('p.name', 'productName')
      .addSelect('p.code', 'productCode')
      .addSelect('p.unit', 'unitName')
      .addSelect('SUM(il.quantity_in - il.quantity_out)', 'openingBalance')
      .leftJoin('products', 'p', 'p.id = il.product_id')
      .where('il.warehouse_id = :warehouseId', { warehouseId })
      .groupBy('il.product_id, p.name, p.code, p.unit');

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
    // ✅ BAO GỒM TẤT CẢ giao dịch trong kỳ (kể cả ADJUSTMENT nếu có)
    const periodQuery = this.inventoryLedgerRepository
      .createQueryBuilder('il')
      .select('il.product_id', 'productId')
      .addSelect('SUM(il.quantity_in)', 'totalIn')
      .addSelect('SUM(il.quantity_out)', 'totalOut')
      .where('il.warehouse_id = :warehouseId', { warehouseId });

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

    periodQuery.groupBy('il.product_id');
    const periodMovements = await periodQuery.getRawMany();
    console.log('📊 Period movements:', periodMovements);

    // 3. Get Closing Balance (All transactions up to toDate)
    const closingQuery = this.inventoryLedgerRepository
      .createQueryBuilder('il')
      .select('il.product_id', 'productId')
      .addSelect('SUM(il.quantity_in - il.quantity_out)', 'closingBalance')
      .where('il.warehouse_id = :warehouseId', { warehouseId });

    if (toDate) {
      const nextDay = new Date(toDate);
      nextDay.setDate(nextDay.getDate() + 1);
      closingQuery.andWhere('il.created_at < :toDate', { toDate: nextDay });
    }

    closingQuery.groupBy('il.product_id');
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
   * Báo cáo nhập xuất tồn theo storeId (tự động tìm warehouse)
   */
  async getInventoryReportByStore(storeId: number, fromDate?: string, toDate?: string) {
    const warehouse = await this.warehouseRepository.findOne({
      where: { storeId, type: 'STORE' },
    });

    if (!warehouse) {
      throw new NotFoundException(`Không tìm thấy kho cho cửa hàng ${storeId}`);
    }

    return this.getInventoryReport(warehouse.id, fromDate, toDate);
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
          amount: Number(item.quantity) * Number(item.unitPrice),
        });
      }
    }

    console.log(`[getDocuments] Returning ${result.length} items`);
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
}
