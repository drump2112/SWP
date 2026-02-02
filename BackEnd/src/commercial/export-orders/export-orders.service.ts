import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ExportOrder } from '../../entities/export-order.entity';
import { ExportOrderItem } from '../../entities/export-order-item.entity';
import { ImportBatch } from '../../entities/import-batch.entity';
import { CreateExportOrderDto } from './dto/create-export-order.dto';
import { UpdateExportOrderDto } from './dto/update-export-order.dto';

@Injectable()
export class ExportOrdersService {
  constructor(
    @InjectRepository(ExportOrder)
    private ordersRepository: Repository<ExportOrder>,
    @InjectRepository(ExportOrderItem)
    private orderItemsRepository: Repository<ExportOrderItem>,
    @InjectRepository(ImportBatch)
    private batchesRepository: Repository<ImportBatch>,
    private dataSource: DataSource,
  ) {}

  async create(createOrderDto: CreateExportOrderDto): Promise<ExportOrder> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Validate stock availability for all items
      for (const itemDto of createOrderDto.items) {
        const batch = await queryRunner.manager.findOne(ImportBatch, {
          where: { id: itemDto.batch_id },
        });

        if (!batch) {
          throw new NotFoundException(`Batch with ID ${itemDto.batch_id} not found`);
        }

        if (batch.remaining_quantity < itemDto.quantity) {
          throw new BadRequestException(
            `Insufficient stock in batch ${batch.batch_code}. Available: ${batch.remaining_quantity}, Requested: ${itemDto.quantity}`
          );
        }
      }

      // 2. Create export order (without items initially)
      const order = queryRunner.manager.create(ExportOrder, {
        warehouse_id: createOrderDto.warehouse_id,
        order_code: createOrderDto.order_number || `XB${Date.now()}`,
        order_date: createOrderDto.order_date ? new Date(createOrderDto.order_date) : new Date(),
        vehicle_number: createOrderDto.vehicle_number,
        driver_name: createOrderDto.driver_name,
        driver_phone: createOrderDto.driver_phone,
        payment_method: createOrderDto.payment_method || 'DEBT',
        payment_status: createOrderDto.payment_status || 'UNPAID',
        status: 'PENDING',
        notes: createOrderDto.notes,
      });

      const savedOrder = await queryRunner.manager.save(order);

      // 3. Create order items
      let subtotal = 0;
      let total_discount = 0;

      for (const itemDto of createOrderDto.items) {
        const batch = await queryRunner.manager.findOne(ImportBatch, {
          where: { id: itemDto.batch_id },
        });

        if (!batch) {
          throw new NotFoundException(`Batch with ID ${itemDto.batch_id} not found`);
        }

        const discount_per_unit = itemDto.discount_amount || 0;
        const line_total = itemDto.quantity * itemDto.unit_price;
        const discount_amount = itemDto.quantity * discount_per_unit;
        const net_amount = line_total - discount_amount;

        // Calculate discount percent for backward compatibility
        const discount_percent = line_total > 0 ? (discount_amount / line_total) * 100 : 0;

        const orderItem = queryRunner.manager.create(ExportOrderItem, {
          export_order_id: savedOrder.id,
          customer_id: itemDto.customer_id,
          import_batch_id: itemDto.batch_id,
          product_id: batch.product_id,
          quantity: itemDto.quantity,
          batch_unit_price: batch.unit_price,
          selling_price: itemDto.unit_price,
          discount_percent: discount_percent,
          discount_amount: discount_amount,
          subtotal: line_total,
          total_amount: net_amount,
        });

        await queryRunner.manager.save(orderItem);

        subtotal += line_total;
        total_discount += discount_amount;
      }

      // 4. Update order totals (triggers will also update, but we set initial values)
      const vat_percent = createOrderDto.vat_percent || 0;
      const total_vat = ((subtotal - total_discount) * vat_percent) / 100;
      const total_amount = subtotal - total_discount + total_vat;

      savedOrder.subtotal = subtotal;
      savedOrder.total_discount = total_discount;
      savedOrder.total_vat = total_vat;
      savedOrder.total_amount = total_amount;
      savedOrder.debt_amount = total_amount;
      savedOrder.paid_amount = 0;

      await queryRunner.manager.save(savedOrder);

      await queryRunner.commitTransaction();

      // Return order with relations
      return await this.findOne(savedOrder.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(filters?: {
    customer_id?: number;
    warehouse_id?: number;
    from_date?: string;
    to_date?: string;
    payment_status?: string;
  }): Promise<ExportOrder[]> {
    const query = this.ordersRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.warehouse', 'warehouse')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.customer', 'customer')
      .leftJoinAndSelect('items.import_batch', 'import_batch')
      .leftJoinAndSelect('import_batch.product', 'product');

    if (filters?.customer_id) {
      query.andWhere('items.customer_id = :customerId', { customerId: filters.customer_id });
    }

    if (filters?.warehouse_id) {
      query.andWhere('order.warehouse_id = :warehouseId', { warehouseId: filters.warehouse_id });
    }

    if (filters?.from_date) {
      query.andWhere('order.order_date >= :fromDate', { fromDate: filters.from_date });
    }

    if (filters?.to_date) {
      query.andWhere('order.order_date <= :toDate', { toDate: filters.to_date });
    }

    if (filters?.payment_status) {
      query.andWhere('order.payment_status = :status', { status: filters.payment_status });
    }

    query.orderBy('order.order_date', 'DESC');

    return await query.getMany();
  }

  async findOne(id: number): Promise<ExportOrder> {
    const order = await this.ordersRepository.findOne({
      where: { id },
      relations: ['warehouse', 'items', 'items.customer', 'items.import_batch', 'items.import_batch.product'],
    });

    if (!order) {
      throw new NotFoundException(`Export order with ID ${id} not found`);
    }

    return order;
  }

  async update(id: number, updateOrderDto: UpdateExportOrderDto): Promise<ExportOrder> {
    const order = await this.findOne(id);

    // Only allow updates for certain fields, not items
    Object.assign(order, updateOrderDto);
    await this.ordersRepository.save(order);

    return await this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const order = await this.findOne(id);

      // Delete triggers will handle restoring batch quantities
      await queryRunner.manager.remove(order);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async updatePaymentStatus(id: number, status: string): Promise<ExportOrder> {
    const order = await this.findOne(id);
    order.payment_status = status;
    await this.ordersRepository.save(order);
    return await this.findOne(id);
  }
}
