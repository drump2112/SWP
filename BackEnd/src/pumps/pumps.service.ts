import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pump } from '../entities/pump.entity';
import { CreatePumpDto, UpdatePumpDto } from './pumps.dto';

@Injectable()
export class PumpsService {
  constructor(
    @InjectRepository(Pump)
    private pumpsRepository: Repository<Pump>,
  ) {}

  async findAll(): Promise<Pump[]> {
    return this.pumpsRepository.find({
      relations: ['store', 'tank', 'product'],
      order: {
        storeId: 'ASC',
        pumpCode: 'ASC',
      },
    });
  }

  async findByStore(storeId: number): Promise<Pump[]> {
    return this.pumpsRepository.find({
      where: { storeId },
      relations: ['tank', 'product'],
      order: {
        pumpCode: 'ASC',
      },
    });
  }

  async findByTank(tankId: number): Promise<Pump[]> {
    return this.pumpsRepository.find({
      where: { tankId },
      relations: ['product'],
      order: {
        pumpCode: 'ASC',
      },
    });
  }

  async findOne(id: number): Promise<Pump | null> {
    return this.pumpsRepository.findOne({
      where: { id },
      relations: ['store', 'tank', 'product'],
    });
  }

  async create(createPumpDto: CreatePumpDto): Promise<Pump> {
    const pump = this.pumpsRepository.create(createPumpDto);
    return this.pumpsRepository.save(pump);
  }

  async update(id: number, updatePumpDto: UpdatePumpDto): Promise<Pump | null> {
    await this.pumpsRepository.update(id, updatePumpDto);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.pumpsRepository.delete(id);
  }
}
