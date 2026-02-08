import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ImportBatch } from '../../entities/import-batch.entity';
import { CreateImportBatchDto } from './dto/create-import-batch.dto';
import { UpdateImportBatchDto } from './dto/update-import-batch.dto';

@Injectable()
export class ImportBatchesService {
  constructor(
    @InjectRepository(ImportBatch)
    private batchesRepository: Repository<ImportBatch>,
  ) {}

  async create(createBatchDto: CreateImportBatchDto): Promise<ImportBatch> {
    // Calculate amounts
    const import_quantity = createBatchDto.import_quantity;
    const unit_price = createBatchDto.unit_price;
    const discount_per_unit = createBatchDto.discount_per_unit || 0;
    const vat_percent = createBatchDto.vat_percent || 0;
    const environmental_tax_rate = createBatchDto.environmental_tax_rate || 0;

    const line_total = import_quantity * unit_price;
    const discount_amount = import_quantity * discount_per_unit;
    const final_unit_price = unit_price - discount_per_unit;
    const subtotal = line_total - discount_amount;
    const vat_amount = (subtotal * vat_percent) / 100;
    const environmental_tax_amount = (subtotal * environmental_tax_rate) / 100;
    const total_amount = subtotal + vat_amount + environmental_tax_amount;

    const batch = this.batchesRepository.create({
      ...createBatchDto,
      discount_amount,
      final_unit_price,
      subtotal,
      vat_amount,
      environmental_tax_amount,
      total_amount,
      remaining_quantity: import_quantity,
      exported_quantity: 0,
      import_date: createBatchDto.import_date ? new Date(createBatchDto.import_date) : new Date(),
    });

    return await this.batchesRepository.save(batch);
  }

  async findAll(filters?: {
    warehouse_id?: number;
    supplier_id?: number;
    product_id?: number;
    from_date?: string;
    to_date?: string;
  }): Promise<ImportBatch[]> {
    const query = this.batchesRepository
      .createQueryBuilder('batch')
      .leftJoinAndSelect('batch.warehouse', 'warehouse')
      .leftJoinAndSelect('batch.supplier', 'supplier')
      .leftJoinAndSelect('batch.product', 'product');

    if (filters?.warehouse_id) {
      query.andWhere('batch.warehouse_id = :warehouseId', { warehouseId: filters.warehouse_id });
    }

    if (filters?.supplier_id) {
      query.andWhere('batch.supplier_id = :supplierId', { supplierId: filters.supplier_id });
    }

    if (filters?.product_id) {
      query.andWhere('batch.product_id = :productId', { productId: filters.product_id });
    }

    if (filters?.from_date) {
      query.andWhere('batch.import_date >= :fromDate', { fromDate: filters.from_date });
    }

    if (filters?.to_date) {
      query.andWhere('batch.import_date <= :toDate', { toDate: filters.to_date });
    }

    query.orderBy('batch.import_date', 'DESC');

    return await query.getMany();
  }

  async findOne(id: number): Promise<ImportBatch> {
    const batch = await this.batchesRepository.findOne({
      where: { id },
      relations: ['warehouse', 'supplier', 'product'],
    });

    if (!batch) {
      throw new NotFoundException(`Import batch with ID ${id} not found`);
    }

    return batch;
  }

  async update(id: number, updateBatchDto: UpdateImportBatchDto): Promise<ImportBatch> {
    const batch = await this.findOne(id);

    // Recalculate amounts if relevant fields are updated
    if (updateBatchDto.import_quantity || updateBatchDto.unit_price || updateBatchDto.vat_percent !== undefined || updateBatchDto.discount_per_unit !== undefined) {
      const import_quantity = updateBatchDto.import_quantity || batch.import_quantity;
      const unit_price = updateBatchDto.unit_price || batch.unit_price;
      const discount_per_unit = updateBatchDto.discount_per_unit !== undefined ? updateBatchDto.discount_per_unit : batch.discount_per_unit;
      const vat_percent = updateBatchDto.vat_percent !== undefined ? updateBatchDto.vat_percent : batch.vat_percent;
      const environmental_tax_rate = updateBatchDto.environmental_tax_rate !== undefined ? updateBatchDto.environmental_tax_rate : batch.environmental_tax_rate;

      const line_total = import_quantity * unit_price;
      const discount_amount = import_quantity * discount_per_unit;
      const final_unit_price = unit_price - discount_per_unit;
      const subtotal = line_total - discount_amount;
      const vat_amount = (subtotal * vat_percent) / 100;
      const environmental_tax_amount = (subtotal * environmental_tax_rate) / 100;
      const total_amount = subtotal + vat_amount + environmental_tax_amount;

      (updateBatchDto as any).discount_amount = discount_amount;
      (updateBatchDto as any).final_unit_price = final_unit_price;
      (updateBatchDto as any).subtotal = subtotal;
      (updateBatchDto as any).vat_amount = vat_amount;
      (updateBatchDto as any).environmental_tax_amount = environmental_tax_amount;
      (updateBatchDto as any).total_amount = total_amount;

      // Adjust remaining quantity if total quantity changed
      if (updateBatchDto.import_quantity && updateBatchDto.import_quantity !== batch.import_quantity) {
        const difference = updateBatchDto.import_quantity - batch.import_quantity;
        (updateBatchDto as any).remaining_quantity = batch.remaining_quantity + difference;
      }
    }

    Object.assign(batch, updateBatchDto);
    return await this.batchesRepository.save(batch);
  }

  async remove(id: number): Promise<void> {
    const batch = await this.findOne(id);

    // Check if batch has been used (remaining_quantity < import_quantity)
    if (batch.remaining_quantity < batch.import_quantity) {
      throw new BadRequestException('Cannot delete batch that has been partially or fully used in exports');
    }

    await this.batchesRepository.remove(batch);
  }

  async getAvailableBatches(productId: number, warehouseId?: number): Promise<ImportBatch[]> {
    const query = this.batchesRepository
      .createQueryBuilder('batch')
      .where('batch.product_id = :productId', { productId })
      .andWhere('batch.remaining_quantity > 0');

    if (warehouseId) {
      query.andWhere('batch.warehouse_id = :warehouseId', { warehouseId });
    }

    query.orderBy('batch.import_date', 'ASC'); // FIFO

    return await query.getMany();
  }
}
