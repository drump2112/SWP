import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommercialCustomer } from '../../entities/commercial-customer.entity';
import { CreateCommercialCustomerDto } from './dto/create-commercial-customer.dto';
import { UpdateCommercialCustomerDto } from './dto/update-commercial-customer.dto';

@Injectable()
export class CommercialCustomersService {
  constructor(
    @InjectRepository(CommercialCustomer)
    private customersRepository: Repository<CommercialCustomer>,
  ) {}

  async create(createCustomerDto: CreateCommercialCustomerDto): Promise<CommercialCustomer> {
    const existing = await this.customersRepository.findOne({
      where: { code: createCustomerDto.code },
    });

    if (existing) {
      throw new ConflictException(`Customer with code ${createCustomerDto.code} already exists`);
    }

    const customer = this.customersRepository.create(createCustomerDto);
    return await this.customersRepository.save(customer);
  }

  async findAll(): Promise<CommercialCustomer[]> {
    return await this.customersRepository.find({
      relations: ['customer_group'],
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: number): Promise<CommercialCustomer> {
    const customer = await this.customersRepository.findOne({
      where: { id },
      relations: ['customer_group'],
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    return customer;
  }

  async update(id: number, updateCustomerDto: UpdateCommercialCustomerDto): Promise<CommercialCustomer> {
    const customer = await this.findOne(id);

    if (updateCustomerDto.code && updateCustomerDto.code !== customer.code) {
      const existing = await this.customersRepository.findOne({
        where: { code: updateCustomerDto.code },
      });

      if (existing) {
        throw new ConflictException(`Customer with code ${updateCustomerDto.code} already exists`);
      }
    }

    Object.assign(customer, updateCustomerDto);
    return await this.customersRepository.save(customer);
  }

  async remove(id: number): Promise<void> {
    const customer = await this.findOne(id);
    await this.customersRepository.remove(customer);
  }

  async findActive(): Promise<CommercialCustomer[]> {
    return await this.customersRepository.find({
      where: { is_active: true },
      relations: ['customer_group'],
      order: { name: 'ASC' },
    });
  }

  async findByGroup(groupId: number): Promise<CommercialCustomer[]> {
    return await this.customersRepository.find({
      where: { customer_group_id: groupId, is_active: true },
      relations: ['customer_group'],
      order: { name: 'ASC' },
    });
  }

  async getCustomersWithDebt(): Promise<CommercialCustomer[]> {
    return await this.customersRepository
      .createQueryBuilder('customer')
      .leftJoinAndSelect('customer.customer_group', 'customer_group')
      .where('customer.current_debt > 0')
      .orderBy('customer.current_debt', 'DESC')
      .getMany();
  }
}
