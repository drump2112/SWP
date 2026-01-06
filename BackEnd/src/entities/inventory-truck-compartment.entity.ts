import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { InventoryDocument } from './inventory-document.entity';
import { Product } from './product.entity';

/**
 * Entity lưu chi tiết từng ngăn xe téc khi nhập hàng
 * Mỗi xe téc có tối đa 7 ngăn
 */
@Entity('inventory_truck_compartments')
export class InventoryTruckCompartment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'document_id' })
  documentId: number;

  @Column({ name: 'product_id', nullable: true })
  productId: number;

  @Column({ name: 'compartment_number', type: 'int' })
  compartmentNumber: number; // Số ngăn: 1-7

  @Column({
    name: 'compartment_height',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    comment: 'Chiều cao téc tại ngăn (cm)',
  })
  compartmentHeight: number;

  @Column({
    name: 'truck_temperature',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    comment: 'Nhiệt độ tại xe téc (°C)',
  })
  truckTemperature: number;

  @Column({
    name: 'truck_volume',
    type: 'decimal',
    precision: 18,
    scale: 3,
    nullable: true,
    comment: 'Thể tích tại nhiệt độ xe téc (lít)',
  })
  truckVolume: number;

  @Column({
    name: 'warehouse_height',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    comment: 'Chiều cao téc tại kho (cm)',
  })
  warehouseHeight: number;

  @Column({
    name: 'actual_temperature',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    comment: 'Nhiệt độ thực tế (°C)',
  })
  actualTemperature: number;

  @Column({
    name: 'actual_volume',
    type: 'decimal',
    precision: 18,
    scale: 3,
    nullable: true,
    comment: 'Thể tích tại nhiệt độ thực tế (lít)',
  })
  actualVolume: number;

  @Column({
    name: 'received_volume',
    type: 'decimal',
    precision: 18,
    scale: 3,
    nullable: true,
    comment: 'Lượng thực nhận (lít)',
  })
  receivedVolume: number;

  @Column({
    name: 'loss_volume',
    type: 'decimal',
    precision: 18,
    scale: 3,
    nullable: true,
    comment: 'Lượng hao hụt (lít)',
  })
  lossVolume: number;

  @Column({
    name: 'height_loss_truck',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    comment: 'Hao hụt chiều cao đo đạc tại xe (cm)',
  })
  heightLossTruck: number;

  @Column({
    name: 'height_loss_warehouse',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    comment: 'Hao hụt chiều cao téc tại kho (cm)',
  })
  heightLossWarehouse: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => InventoryDocument)
  @JoinColumn({ name: 'document_id' })
  document: InventoryDocument;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;
}
