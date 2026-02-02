import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommercialCustomerGroup } from '../../entities/commercial-customer-group.entity';
import { CreateCustomerGroupDto } from './dto/create-customer-group.dto';
import { UpdateCustomerGroupDto } from './dto/update-customer-group.dto';

@Injectable()
export class CustomerGroupsService {
  constructor(
    @InjectRepository(CommercialCustomerGroup)
    private groupsRepository: Repository<CommercialCustomerGroup>,
  ) {}

  async create(createGroupDto: CreateCustomerGroupDto): Promise<CommercialCustomerGroup> {
    const existing = await this.groupsRepository.findOne({
      where: { code: createGroupDto.code },
    });

    if (existing) {
      throw new ConflictException(`Customer group with code ${createGroupDto.code} already exists`);
    }

    const group = this.groupsRepository.create(createGroupDto);
    return await this.groupsRepository.save(group);
  }

  async findAll(): Promise<CommercialCustomerGroup[]> {
    return await this.groupsRepository.find({
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: number): Promise<CommercialCustomerGroup> {
    const group = await this.groupsRepository.findOne({
      where: { id },
    });

    if (!group) {
      throw new NotFoundException(`Customer group with ID ${id} not found`);
    }

    return group;
  }

  async update(id: number, updateGroupDto: UpdateCustomerGroupDto): Promise<CommercialCustomerGroup> {
    const group = await this.findOne(id);

    if (updateGroupDto.code && updateGroupDto.code !== group.code) {
      const existing = await this.groupsRepository.findOne({
        where: { code: updateGroupDto.code },
      });

      if (existing) {
        throw new ConflictException(`Customer group with code ${updateGroupDto.code} already exists`);
      }
    }

    Object.assign(group, updateGroupDto);
    return await this.groupsRepository.save(group);
  }

  async remove(id: number): Promise<void> {
    const group = await this.findOne(id);
    await this.groupsRepository.remove(group);
  }

  async findActive(): Promise<CommercialCustomerGroup[]> {
    return await this.groupsRepository.find({
      where: { is_active: true },
      order: { name: 'ASC' },
    });
  }
}
