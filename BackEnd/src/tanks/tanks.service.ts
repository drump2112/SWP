import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tank } from '../entities/tank.entity';
import { CreateTankDto, UpdateTankDto } from './tanks.dto';
import { InventoryStockCalculatorService } from '../inventory/inventory-stock-calculator.service';

@Injectable()
export class TanksService {
  constructor(
    @InjectRepository(Tank)
    private tanksRepository: Repository<Tank>,
    private stockCalculatorService: InventoryStockCalculatorService,
  ) {}

  /**
   * Lấy danh sách tất cả bể chứa với tồn kho từ cột current_stock
   */
  async findAll(): Promise<any[]> {
    const tanks = await this.tanksRepository
      .createQueryBuilder('tank')
      .leftJoinAndSelect('tank.store', 'store')
      .leftJoinAndSelect('tank.product', 'product')
      .leftJoin('tank.pumps', 'pumps')
      .addSelect(['pumps.id', 'pumps.pumpCode', 'pumps.name'])
      .orderBy('tank.storeId', 'ASC')
      .addOrderBy('tank.tankCode', 'ASC')
      .getMany();

    // Sử dụng current_stock từ bảng tanks
    return tanks.map(tank => ({
      ...tank,
      currentStock: Number(tank.currentStock) || 0,
      fillPercentage: tank.capacity > 0
        ? (Number(tank.currentStock) / Number(tank.capacity)) * 100
        : 0,
    }));
  }

  /**
   * Lấy danh sách bể theo cửa hàng với tồn kho từ cột current_stock
   * Lưu ý: current_stock trong bảng tanks là giá trị được cập nhật khi chốt kho
   */
  async findByStore(storeId: number): Promise<any[]> {
    const tanks = await this.tanksRepository
      .createQueryBuilder('tank')
      .leftJoinAndSelect('tank.product', 'product')
      .leftJoin('tank.pumps', 'pumps')
      .addSelect(['pumps.id', 'pumps.pumpCode', 'pumps.name'])
      .where('tank.storeId = :storeId', { storeId })
      .orderBy('tank.tankCode', 'ASC')
      .getMany();

    // Sử dụng current_stock từ bảng tanks (giá trị được setup/cập nhật khi chốt kho)
    return tanks.map(tank => ({
      ...tank,
      currentStock: Number(tank.currentStock) || 0,
      fillPercentage: tank.capacity > 0
        ? (Number(tank.currentStock) / Number(tank.capacity)) * 100
        : 0,
    }));
  }

  /**
   * Lấy một bể chứa với tồn kho từ cột current_stock
   */
  async findOne(id: number): Promise<any | null> {
    const tank = await this.tanksRepository
      .createQueryBuilder('tank')
      .leftJoinAndSelect('tank.store', 'store')
      .leftJoinAndSelect('tank.product', 'product')
      .leftJoin('tank.pumps', 'pumps')
      .addSelect(['pumps.id', 'pumps.pumpCode', 'pumps.name'])
      .where('tank.id = :id', { id })
      .getOne();

    if (!tank) {
      return null;
    }

    // Sử dụng current_stock từ bảng tanks
    const currentStock = Number(tank.currentStock) || 0;

    return {
      ...tank,
      currentStock,
      fillPercentage: tank.capacity > 0
        ? (currentStock / Number(tank.capacity)) * 100
        : 0,
    };
  }

  async create(createTankDto: CreateTankDto): Promise<Tank> {
    const tank = this.tanksRepository.create(createTankDto);
    return this.tanksRepository.save(tank);
  }

  async update(id: number, updateTankDto: UpdateTankDto): Promise<Tank | null> {
    await this.tanksRepository.update(id, updateTankDto);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.tanksRepository.delete(id);
  }
}
