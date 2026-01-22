import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, Between } from 'typeorm';
import { InventoryClosing } from '../entities/inventory-closing.entity';
import { Tank } from '../entities/tank.entity';
import { Store } from '../entities/store.entity';
import { Warehouse } from '../entities/warehouse.entity';
import { InventoryLedger } from '../entities/inventory-ledger.entity';
import { StoreLossConfig } from '../entities/store-loss-config.entity';
import { CreateInventoryClosingDto, InventoryClosingPreviewDto, InventoryClosingItemDto } from './dto/inventory-closing.dto';

@Injectable()
export class InventoryClosingService {
  constructor(
    @InjectRepository(InventoryClosing)
    private closingRepository: Repository<InventoryClosing>,
    @InjectRepository(Tank)
    private tankRepository: Repository<Tank>,
    @InjectRepository(Store)
    private storeRepository: Repository<Store>,
    @InjectRepository(Warehouse)
    private warehouseRepository: Repository<Warehouse>,
    @InjectRepository(InventoryLedger)
    private ledgerRepository: Repository<InventoryLedger>,
    @InjectRepository(StoreLossConfig)
    private lossConfigRepository: Repository<StoreLossConfig>,
  ) {}

  /**
   * Lấy tồn đầu kỳ cho tank
   * = closing_balance của kỳ chốt trước đó hoặc current_stock + ledger movements
   */
  async getOpeningBalance(tankId: number, periodFrom: Date, warehouseId: number): Promise<number> {
    // Tìm kỳ chốt gần nhất TRƯỚC periodFrom
    const lastClosing = await this.closingRepository.findOne({
      where: {
        tankId,
        periodTo: LessThan(periodFrom),
      },
      order: { periodTo: 'DESC' },
    });

    if (lastClosing) {
      return Number(lastClosing.closingBalance);
    }

    // Nếu chưa có kỳ chốt nào → tính từ current_stock + ledger trước periodFrom
    const tank = await this.tankRepository.findOne({ where: { id: tankId } });
    if (!tank) return 0;

    const initialStock = Number(tank.currentStock || 0);

    const ledgerResult = await this.ledgerRepository
      .createQueryBuilder('il')
      .select('COALESCE(SUM(il.quantityIn - il.quantityOut), 0)', 'balance')
      .where('il.warehouseId = :warehouseId', { warehouseId })
      .andWhere('il.tankId = :tankId', { tankId })
      .andWhere('il.createdAt < :periodFrom', { periodFrom })
      .getRawOne();

    return initialStock + Number(ledgerResult?.balance || 0);
  }

  /**
   * Lấy hệ số hao hụt hiệu lực cho store + category tại thời điểm
   */
  async getLossConfig(storeId: number, productCategory: string, date: Date): Promise<{ rate: number; configId: number | null }> {
    const dateStr = date.toISOString().split('T')[0];

    const config = await this.lossConfigRepository
      .createQueryBuilder('slc')
      .where('slc.storeId = :storeId', { storeId })
      .andWhere('slc.productCategory = :productCategory', { productCategory })
      .andWhere('slc.effectiveFrom <= :date', { date: dateStr })
      .andWhere('(slc.effectiveTo IS NULL OR slc.effectiveTo >= :date)', { date: dateStr })
      .orderBy('slc.effectiveFrom', 'DESC')
      .getOne();

    return {
      rate: config ? Number(config.lossRate) : 0,
      configId: config ? config.id : null,
    };
  }

  /**
   * Xem trước dữ liệu chốt kỳ (chưa lưu)
   */
  async previewClosing(dto: CreateInventoryClosingDto): Promise<InventoryClosingPreviewDto> {
    const store = await this.storeRepository.findOne({ where: { id: dto.storeId } });
    if (!store) {
      throw new NotFoundException(`Store ${dto.storeId} không tồn tại`);
    }

    const warehouse = await this.warehouseRepository.findOne({
      where: { storeId: dto.storeId, type: 'STORE' },
    });
    if (!warehouse) {
      throw new NotFoundException(`Không tìm thấy kho cho store ${dto.storeId}`);
    }

    // Kiểm tra xem đã có kỳ chốt chồng lấn chưa
    const existingClosing = await this.closingRepository.findOne({
      where: {
        storeId: dto.storeId,
        periodFrom: new Date(dto.periodFrom),
        periodTo: new Date(dto.periodTo),
      },
    });
    if (existingClosing) {
      throw new BadRequestException(`Kỳ ${dto.periodFrom} → ${dto.periodTo} đã được chốt trước đó`);
    }

    const tanks = await this.tankRepository.find({
      where: { storeId: dto.storeId, isActive: true },
      relations: ['product'],
      order: { tankCode: 'ASC' },
    });

    const periodFrom = new Date(dto.periodFrom);
    const periodTo = new Date(dto.periodTo);
    const nextDay = new Date(periodTo);
    nextDay.setDate(nextDay.getDate() + 1);

    const items: InventoryClosingItemDto[] = [];

    for (const tank of tanks) {
      const productCategory = tank.product?.category || 'GASOLINE';

      // 1. Tồn đầu kỳ
      const openingBalance = await this.getOpeningBalance(tank.id, periodFrom, warehouse.id);

      // 2. Nhập/xuất trong kỳ
      const periodResult = await this.ledgerRepository
        .createQueryBuilder('il')
        .select('COALESCE(SUM(il.quantityIn), 0)', 'totalIn')
        .addSelect('COALESCE(SUM(il.quantityOut), 0)', 'totalOut')
        .where('il.warehouseId = :warehouseId', { warehouseId: warehouse.id })
        .andWhere('il.tankId = :tankId', { tankId: tank.id })
        .andWhere('il.createdAt >= :periodFrom', { periodFrom })
        .andWhere('il.createdAt < :periodTo', { periodTo: nextDay })
        .getRawOne();

      const importQuantity = Number(periodResult?.totalIn || 0);
      const exportQuantity = Number(periodResult?.totalOut || 0);

      // 3. Hệ số hao hụt (lấy theo ngày cuối kỳ)
      const { rate: lossRate, configId: lossConfigId } = await this.getLossConfig(
        dto.storeId,
        productCategory,
        periodTo,
      );

      // 4. Tính toán
      const lossAmount = exportQuantity * lossRate;
      const closingBalance = openingBalance + importQuantity - exportQuantity - lossAmount;

      items.push({
        tankId: tank.id,
        tankCode: tank.tankCode,
        tankName: tank.name,
        productId: tank.productId,
        productName: tank.product?.name || '',
        productCategory,
        openingBalance,
        importQuantity,
        exportQuantity,
        lossRate,
        lossAmount,
        closingBalance,
        lossConfigId,
      });
    }

    return {
      storeId: dto.storeId,
      storeName: store.name,
      periodFrom: dto.periodFrom,
      periodTo: dto.periodTo,
      items,
    };
  }

  /**
   * Thực hiện chốt kỳ (lưu vào DB)
   */
  async executeClosing(dto: CreateInventoryClosingDto, userId?: number): Promise<InventoryClosing[]> {
    const preview = await this.previewClosing(dto);
    const closingDate = new Date();

    const closings: InventoryClosing[] = [];

    for (const item of preview.items) {
      const closing = this.closingRepository.create({
        storeId: dto.storeId,
        tankId: item.tankId,
        periodFrom: new Date(dto.periodFrom),
        periodTo: new Date(dto.periodTo),
        closingDate,
        openingBalance: item.openingBalance,
        importQuantity: item.importQuantity,
        exportQuantity: item.exportQuantity,
        lossRate: item.lossRate,
        lossAmount: item.lossAmount,
        closingBalance: item.closingBalance,
        lossConfigId: item.lossConfigId || null,
        productCategory: item.productCategory,
        notes: dto.notes || null,
        createdBy: userId || null,
      });

      const saved = await this.closingRepository.save(closing);
      closings.push(saved);
    }

    return closings;
  }

  /**
   * Lấy danh sách kỳ đã chốt theo store
   */
  async getClosingsByStore(storeId: number, fromDate?: string, toDate?: string): Promise<InventoryClosing[]> {
    const query = this.closingRepository
      .createQueryBuilder('ic')
      .leftJoinAndSelect('ic.tank', 'tank')
      .leftJoinAndSelect('tank.product', 'product')
      .leftJoinAndSelect('ic.creator', 'creator')
      .where('ic.storeId = :storeId', { storeId })
      .orderBy('ic.periodFrom', 'ASC')
      .addOrderBy('tank.tankCode', 'ASC');

    if (fromDate) {
      query.andWhere('ic.periodTo >= :fromDate', { fromDate: new Date(fromDate) });
    }
    if (toDate) {
      query.andWhere('ic.periodFrom <= :toDate', { toDate: new Date(toDate) });
    }

    return query.getMany();
  }

  /**
   * Lấy danh sách kỳ chốt (unique period) theo store
   */
  async getClosingPeriods(storeId: number): Promise<{ periodFrom: Date; periodTo: Date; closingDate: Date }[]> {
    const result = await this.closingRepository
      .createQueryBuilder('ic')
      .select('ic.periodFrom', 'periodFrom')
      .addSelect('ic.periodTo', 'periodTo')
      .addSelect('MAX(ic.closingDate)', 'closingDate')
      .where('ic.storeId = :storeId', { storeId })
      .groupBy('ic.periodFrom')
      .addGroupBy('ic.periodTo')
      .orderBy('ic.periodFrom', 'DESC')
      .getRawMany();

    return result;
  }

  /**
   * Xóa kỳ chốt (chỉ cho phép xóa kỳ mới nhất)
   */
  async deleteClosing(storeId: number, periodFrom: string, periodTo: string): Promise<void> {
    // Kiểm tra có phải kỳ mới nhất không
    const latestPeriod = await this.closingRepository
      .createQueryBuilder('ic')
      .select('MAX(ic.periodTo)', 'maxPeriodTo')
      .where('ic.storeId = :storeId', { storeId })
      .getRawOne();

    const periodToDate = new Date(periodTo);
    if (latestPeriod?.maxPeriodTo && new Date(latestPeriod.maxPeriodTo) > periodToDate) {
      throw new BadRequestException('Chỉ được phép xóa kỳ chốt mới nhất');
    }

    await this.closingRepository.delete({
      storeId,
      periodFrom: new Date(periodFrom),
      periodTo: new Date(periodTo),
    });
  }

  /**
   * Lấy báo cáo tồn kho theo kỳ đã chốt
   */
  async getReportByClosedPeriods(
    storeId: number,
    fromDate: string,
    toDate: string,
  ): Promise<{
    closedPeriods: InventoryClosing[];
    hasUnclosedPeriod: boolean;
  }> {
    const closings = await this.getClosingsByStore(storeId, fromDate, toDate);

    // Kiểm tra xem có khoảng thời gian chưa chốt không
    // Logic đơn giản: nếu toDate > max(periodTo) của các kỳ chốt
    let hasUnclosedPeriod = false;
    if (closings.length > 0) {
      const maxPeriodTo = closings.reduce((max, c) =>
        new Date(c.periodTo) > max ? new Date(c.periodTo) : max,
        new Date(closings[0].periodTo)
      );
      hasUnclosedPeriod = new Date(toDate) > maxPeriodTo;
    } else {
      hasUnclosedPeriod = true;
    }

    return {
      closedPeriods: closings,
      hasUnclosedPeriod,
    };
  }
}
