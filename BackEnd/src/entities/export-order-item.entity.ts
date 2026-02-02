import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ExportOrder } from './export-order.entity';
import { ImportBatch } from './import-batch.entity';
import { Product } from './product.entity';
import { CommercialCustomer } from './commercial-customer.entity';

@Entity('export_order_items')
export class ExportOrderItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  export_order_id: number;

  @ManyToOne(() => ExportOrder, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'export_order_id' })
  export_order: ExportOrder;

  @Column()
  customer_id: number;

  @ManyToOne(() => CommercialCustomer)
  @JoinColumn({ name: 'customer_id' })
  customer: CommercialCustomer;

  @Column()
  import_batch_id: number;

  @ManyToOne(() => ImportBatch)
  @JoinColumn({ name: 'import_batch_id' })
  import_batch: ImportBatch;

  @Column()
  product_id: number;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  // Số lượng
  @Column({ type: 'decimal', precision: 18, scale: 3 })
  quantity: number;

  // Giá
  @Column({ type: 'decimal', precision: 18, scale: 2 })
  batch_unit_price: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  selling_price: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  markup_percent: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  discount_percent: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  discount_amount: number;

  // Thuế
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  vat_percent: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  vat_amount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  environmental_tax_rate: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  environmental_tax_amount: number;

  // Tổng tiền
  @Column({ type: 'decimal', precision: 18, scale: 2 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  total_amount: number;

  // Lợi nhuận
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  profit_amount: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  created_at: Date;
}
