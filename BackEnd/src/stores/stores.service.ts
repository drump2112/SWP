import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Store } from '../entities/store.entity';
import { CreateStoreDto } from './dto/create-store.dto';

@Injectable()
export class StoresService {
  constructor(
    @InjectRepository(Store)
    private storeRepository: Repository<Store>,
  ) {}

  async create(createStoreDto: CreateStoreDto): Promise<Store> {
    const store = this.storeRepository.create(createStoreDto);
    return this.storeRepository.save(store);
  }

  async findAll() {
    return this.storeRepository.find({ relations: ['region'] });
  }

  async findOne(id: number) {
    return this.storeRepository.findOne({
      where: { id },
      relations: ['region'],
    });
  }

  async update(id: number, updateStoreDto: Partial<CreateStoreDto>) {
    await this.storeRepository.update(id, updateStoreDto);
    return this.findOne(id);
  }

  async remove(id: number) {
    // Soft delete: set isActive = false instead of deleting
    await this.storeRepository.update(id, { isActive: false });
    return { message: 'Store has been deactivated successfully' };
  }

  async restore(id: number) {
    // Restore: set isActive = true
    await this.storeRepository.update(id, { isActive: true });
    return this.findOne(id);
  }

  async findAllIncludingInactive() {
    return this.storeRepository.find({ relations: ['region'] });
  }
}
