import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommercialWarehouse } from '../../entities/commercial-warehouse.entity';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';

@Injectable()
export class WarehousesService {
  constructor(
    @InjectRepository(CommercialWarehouse)
    private warehousesRepository: Repository<CommercialWarehouse>,
  ) {}

  async create(createWarehouseDto: CreateWarehouseDto): Promise<CommercialWarehouse> {
    const existing = await this.warehousesRepository.findOne({
      where: { code: createWarehouseDto.code },
    });

    if (existing) {
      throw new ConflictException(`Warehouse with code ${createWarehouseDto.code} already exists`);
    }

    const warehouse = this.warehousesRepository.create(createWarehouseDto);
    return await this.warehousesRepository.save(warehouse);
  }

  async findAll(): Promise<CommercialWarehouse[]> {
    return await this.warehousesRepository.find({
      relations: ['region'],
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: number): Promise<CommercialWarehouse> {
    const warehouse = await this.warehousesRepository.findOne({
      where: { id },
      relations: ['region'],
    });

    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID ${id} not found`);
    }

    return warehouse;
  }

  async update(id: number, updateWarehouseDto: UpdateWarehouseDto): Promise<CommercialWarehouse> {
    const warehouse = await this.findOne(id);

    if (updateWarehouseDto.code && updateWarehouseDto.code !== warehouse.code) {
      const existing = await this.warehousesRepository.findOne({
        where: { code: updateWarehouseDto.code },
      });

      if (existing) {
        throw new ConflictException(`Warehouse with code ${updateWarehouseDto.code} already exists`);
      }
    }

    Object.assign(warehouse, updateWarehouseDto);
    return await this.warehousesRepository.save(warehouse);
  }

  async remove(id: number): Promise<void> {
    const warehouse = await this.findOne(id);
    await this.warehousesRepository.remove(warehouse);
  }

  async findByRegion(regionId: number): Promise<CommercialWarehouse[]> {
    return await this.warehousesRepository.find({
      where: { region_id: regionId, is_active: true },
      order: { name: 'ASC' },
    });
  }
}
