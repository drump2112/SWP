import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Supplier } from '../../entities/supplier.entity';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private suppliersRepository: Repository<Supplier>,
  ) {}

  async create(createSupplierDto: CreateSupplierDto): Promise<Supplier> {
    // Check if code already exists
    const existing = await this.suppliersRepository.findOne({
      where: { code: createSupplierDto.code },
    });

    if (existing) {
      throw new ConflictException(`Supplier with code ${createSupplierDto.code} already exists`);
    }

    const supplier = this.suppliersRepository.create(createSupplierDto);
    return await this.suppliersRepository.save(supplier);
  }

  async findAll(): Promise<Supplier[]> {
    return await this.suppliersRepository.find({
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Supplier> {
    const supplier = await this.suppliersRepository.findOne({
      where: { id },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    return supplier;
  }

  async update(id: number, updateSupplierDto: UpdateSupplierDto): Promise<Supplier> {
    const supplier = await this.findOne(id);

    // Check code uniqueness if code is being updated
    if (updateSupplierDto.code && updateSupplierDto.code !== supplier.code) {
      const existing = await this.suppliersRepository.findOne({
        where: { code: updateSupplierDto.code },
      });

      if (existing) {
        throw new ConflictException(`Supplier with code ${updateSupplierDto.code} already exists`);
      }
    }

    Object.assign(supplier, updateSupplierDto);
    return await this.suppliersRepository.save(supplier);
  }

  async remove(id: number): Promise<void> {
    const supplier = await this.findOne(id);
    await this.suppliersRepository.remove(supplier);
  }

  async findActive(): Promise<Supplier[]> {
    return await this.suppliersRepository.find({
      where: { is_active: true },
      order: { name: 'ASC' },
    });
  }
}
