import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual, IsNull, Or } from 'typeorm';
import { StoreLossConfig } from '../entities/store-loss-config.entity';
import { ProductCategory } from '../entities/product.entity';
import { CreateLossConfigDto, UpdateLossConfigDto } from './dto/loss-config.dto';

@Injectable()
export class LossConfigService {
  constructor(
    @InjectRepository(StoreLossConfig)
    private lossConfigRepository: Repository<StoreLossConfig>,
  ) {}

  /**
   * Lấy tất cả cấu hình hao hụt của một cửa hàng
   */
  async findByStore(storeId: number): Promise<StoreLossConfig[]> {
    return this.lossConfigRepository.find({
      where: { storeId },
      relations: ['store', 'creator'],
      order: { productCategory: 'ASC', effectiveFrom: 'DESC' },
    });
  }

  /**
   * Lấy tất cả cấu hình (admin)
   */
  async findAll(): Promise<StoreLossConfig[]> {
    return this.lossConfigRepository.find({
      relations: ['store', 'creator'],
      order: { storeId: 'ASC', productCategory: 'ASC', effectiveFrom: 'DESC' },
    });
  }

  /**
   * Lấy cấu hình theo ID
   */
  async findById(id: number): Promise<StoreLossConfig> {
    const config = await this.lossConfigRepository.findOne({
      where: { id },
      relations: ['store', 'creator'],
    });
    if (!config) {
      throw new NotFoundException(`Không tìm thấy cấu hình hao hụt ID ${id}`);
    }
    return config;
  }

  /**
   * Lấy hệ số hao hụt hiện hành cho store + category tại một ngày cụ thể
   */
  async getEffectiveRate(
    storeId: number,
    productCategory: ProductCategory,
    date: Date = new Date(),
  ): Promise<number> {
    const dateStr = date.toISOString().split('T')[0];

    const config = await this.lossConfigRepository
      .createQueryBuilder('slc')
      .where('slc.storeId = :storeId', { storeId })
      .andWhere('slc.productCategory = :productCategory', { productCategory })
      .andWhere('slc.effectiveFrom <= :date', { date: dateStr })
      .andWhere('(slc.effectiveTo IS NULL OR slc.effectiveTo >= :date)', { date: dateStr })
      .orderBy('slc.effectiveFrom', 'DESC')
      .getOne();

    return config ? Number(config.lossRate) : 0;
  }

  /**
   * Tạo cấu hình mới
   */
  async create(dto: CreateLossConfigDto, userId?: number): Promise<StoreLossConfig> {
    // Kiểm tra xem đã có cấu hình trùng không
    const existing = await this.lossConfigRepository.findOne({
      where: {
        storeId: dto.storeId,
        productCategory: dto.productCategory,
        effectiveFrom: new Date(dto.effectiveFrom),
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Đã tồn tại cấu hình cho cửa hàng này với loại ${dto.productCategory} từ ngày ${dto.effectiveFrom}`,
      );
    }

    // Tự động đóng cấu hình cũ nếu có
    await this.closeOldConfigs(dto.storeId, dto.productCategory, dto.effectiveFrom);

    const config = this.lossConfigRepository.create({
      storeId: dto.storeId,
      productCategory: dto.productCategory,
      lossRate: dto.lossRate,
      effectiveFrom: new Date(dto.effectiveFrom),
      effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
      notes: dto.notes || null,
      createdBy: userId || null,
    });

    return this.lossConfigRepository.save(config);
  }

  /**
   * Đóng các cấu hình cũ khi tạo cấu hình mới
   */
  private async closeOldConfigs(
    storeId: number,
    productCategory: ProductCategory,
    newEffectiveFrom: string,
  ): Promise<void> {
    const newFromDate = new Date(newEffectiveFrom);
    const dayBefore = new Date(newFromDate);
    dayBefore.setDate(dayBefore.getDate() - 1);

    // Cập nhật effectiveTo của các config cũ chưa đóng
    await this.lossConfigRepository
      .createQueryBuilder()
      .update(StoreLossConfig)
      .set({ effectiveTo: dayBefore })
      .where('storeId = :storeId', { storeId })
      .andWhere('productCategory = :productCategory', { productCategory })
      .andWhere('effectiveTo IS NULL')
      .andWhere('effectiveFrom < :newFromDate', { newFromDate })
      .execute();
  }

  /**
   * Cập nhật cấu hình
   */
  async update(id: number, dto: UpdateLossConfigDto): Promise<StoreLossConfig> {
    const config = await this.findById(id);

    if (dto.productCategory !== undefined) config.productCategory = dto.productCategory;
    if (dto.lossRate !== undefined) config.lossRate = dto.lossRate;
    if (dto.effectiveFrom !== undefined) config.effectiveFrom = new Date(dto.effectiveFrom);
    if (dto.effectiveTo !== undefined) config.effectiveTo = dto.effectiveTo ? new Date(dto.effectiveTo) : null;
    if (dto.notes !== undefined) config.notes = dto.notes || null;

    return this.lossConfigRepository.save(config);
  }

  /**
   * Xóa cấu hình
   */
  async delete(id: number): Promise<void> {
    const config = await this.findById(id);
    await this.lossConfigRepository.remove(config);
  }

  /**
   * Lấy tất cả cấu hình đang hiệu lực của một cửa hàng
   */
  async getCurrentConfigs(storeId: number): Promise<StoreLossConfig[]> {
    const today = new Date().toISOString().split('T')[0];

    return this.lossConfigRepository
      .createQueryBuilder('slc')
      .where('slc.storeId = :storeId', { storeId })
      .andWhere('slc.effectiveFrom <= :today', { today })
      .andWhere('(slc.effectiveTo IS NULL OR slc.effectiveTo >= :today)', { today })
      .orderBy('slc.productCategory', 'ASC')
      .getMany();
  }
}
