import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { InventoryCheck } from '../entities/inventory-check.entity';
import { CreateInventoryCheckDto, InventoryCheckQueryDto } from './dto/inventory-check.dto';

@Injectable()
export class InventoryCheckService {
  constructor(
    @InjectRepository(InventoryCheck)
    private inventoryCheckRepository: Repository<InventoryCheck>,
  ) {}

  /**
   * Tạo biên bản kiểm kê mới
   */
  async create(dto: CreateInventoryCheckDto, userId: number): Promise<InventoryCheck> {
    const inventoryCheck = this.inventoryCheckRepository.create({
      storeId: dto.storeId,
      shiftId: dto.shiftId || null,
      checkAt: dto.checkAt ? new Date(dto.checkAt) : new Date(),
      member1Name: dto.member1Name || null,
      member2Name: dto.member2Name || null,
      tankData: dto.tankData || [],
      pumpData: dto.pumpData || [],
      reason: dto.reason || null,
      conclusion: dto.conclusion || null,
      totalDifference: dto.totalDifference || 0,
      status: dto.status || 'DRAFT',
      createdBy: userId,
    });

    return this.inventoryCheckRepository.save(inventoryCheck);
  }

  /**
   * Lấy danh sách biên bản kiểm kê theo điều kiện
   */
  async findAll(query: InventoryCheckQueryDto): Promise<InventoryCheck[]> {
    const whereConditions: any = {};

    if (query.storeId) {
      whereConditions.storeId = query.storeId;
    }

    if (query.status) {
      whereConditions.status = query.status;
    }

    if (query.fromDate && query.toDate) {
      whereConditions.checkAt = Between(new Date(query.fromDate), new Date(query.toDate + 'T23:59:59'));
    } else if (query.fromDate) {
      whereConditions.checkAt = MoreThanOrEqual(new Date(query.fromDate));
    } else if (query.toDate) {
      whereConditions.checkAt = LessThanOrEqual(new Date(query.toDate + 'T23:59:59'));
    }

    return this.inventoryCheckRepository.find({
      where: whereConditions,
      relations: ['store', 'shift', 'creator'],
      order: { checkAt: 'DESC' },
    });
  }

  /**
   * Lấy chi tiết 1 biên bản
   */
  async findOne(id: number): Promise<InventoryCheck> {
    const inventoryCheck = await this.inventoryCheckRepository.findOne({
      where: { id },
      relations: ['store', 'shift', 'creator'],
    });

    if (!inventoryCheck) {
      throw new NotFoundException(`Không tìm thấy biên bản kiểm kê #${id}`);
    }

    return inventoryCheck;
  }

  /**
   * Cập nhật biên bản
   */
  async update(id: number, dto: Partial<CreateInventoryCheckDto>): Promise<InventoryCheck> {
    const inventoryCheck = await this.findOne(id);

    Object.assign(inventoryCheck, {
      ...dto,
      checkAt: dto.checkAt ? new Date(dto.checkAt) : inventoryCheck.checkAt,
    });

    return this.inventoryCheckRepository.save(inventoryCheck);
  }

  /**
   * Xóa biên bản
   */
  async remove(id: number): Promise<void> {
    const inventoryCheck = await this.findOne(id);
    await this.inventoryCheckRepository.remove(inventoryCheck);
  }

  /**
   * Xác nhận biên bản (DRAFT -> CONFIRMED)
   */
  async confirm(id: number): Promise<InventoryCheck> {
    const inventoryCheck = await this.findOne(id);
    inventoryCheck.status = 'CONFIRMED';
    return this.inventoryCheckRepository.save(inventoryCheck);
  }
}
