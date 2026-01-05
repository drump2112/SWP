import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InventoryDocument } from '../entities/inventory-document.entity';
import { InventoryDocumentItem } from '../entities/inventory-document-item.entity';
import { InventoryLedger } from '../entities/inventory-ledger.entity';
import { Warehouse } from '../entities/warehouse.entity';
import { Tank } from '../entities/tank.entity';
import { CreateInventoryDocumentDto } from './dto/create-inventory-document.dto';

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
    private dataSource: DataSource,
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

        // Ghi inventory ledger
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

        // Update Tank Stock if tankId is present
        if (item.tankId) {
          const tank = await manager.findOne(Tank, { where: { id: item.tankId } });
          if (tank) {
            if (isInbound) {
              tank.currentStock = Number(tank.currentStock) + Number(item.quantity);
            } else {
              tank.currentStock = Number(tank.currentStock) - Number(item.quantity);
            }
            await manager.save(Tank, tank);
          }
        }
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

  async getInventoryReport(warehouseId: number) {
    const balances = await this.getInventoryBalance(warehouseId);

    return {
      warehouseId,
      balances,
    };
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
}
