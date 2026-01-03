import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tank } from '../entities/tank.entity';
import { CreateTankDto, UpdateTankDto } from './tanks.dto';

@Injectable()
export class TanksService {
  constructor(
    @InjectRepository(Tank)
    private tanksRepository: Repository<Tank>,
  ) {}

  async findAll(): Promise<Tank[]> {
    return this.tanksRepository.find({
      relations: ['store', 'product', 'pumps'],
      order: {
        storeId: 'ASC',
        tankCode: 'ASC',
      },
    });
  }

  async findByStore(storeId: number): Promise<Tank[]> {
    return this.tanksRepository.find({
      where: { storeId },
      relations: ['product', 'pumps'],
      order: {
        tankCode: 'ASC',
      },
    });
  }

  async findOne(id: number): Promise<Tank | null> {
    return this.tanksRepository.findOne({
      where: { id },
      relations: ['store', 'product', 'pumps'],
    });
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
