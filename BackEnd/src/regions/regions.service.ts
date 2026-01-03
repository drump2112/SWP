import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Region } from '../entities/region.entity';
import { CreateRegionDto } from './dto/create-region.dto';

@Injectable()
export class RegionsService {
  constructor(
    @InjectRepository(Region)
    private regionRepository: Repository<Region>,
  ) {}

  async create(createRegionDto: CreateRegionDto): Promise<Region> {
    const region = this.regionRepository.create(createRegionDto);
    return this.regionRepository.save(region);
  }

  async findAll() {
    return this.regionRepository.find({ relations: ['stores'] });
  }

  async findOne(id: number) {
    return this.regionRepository.findOne({
      where: { id },
      relations: ['stores'],
    });
  }

  async update(id: number, updateRegionDto: Partial<CreateRegionDto>) {
    await this.regionRepository.update(id, updateRegionDto);
    return this.findOne(id);
  }

  async remove(id: number) {
    return this.regionRepository.delete(id);
  }
}
