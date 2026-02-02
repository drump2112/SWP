import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CommercialWarehouse } from './commercial-warehouse.entity';
import { Supplier } from './supplier.entity';
import { Product } from './product.entity';
import { User } from './user.entity';

@Entity('import_batches')
export class ImportBatch {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 50 })
  batch_code: string;

  @Column()
  warehouse_id: number;

  @ManyToOne(() => CommercialWarehouse)
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: CommercialWarehouse;

  @Column()
  supplier_id: number;

  @ManyToOne(() => Supplier)
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  @Column()
  product_id: number;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  price_at_import: number;

  // Số lượng
  @Column({ type: 'decimal', precision: 18, scale: 3 })
  import_quantity: number;

  @Column({ type: 'decimal', precision: 18, scale: 3 })
  remaining_quantity: number;

  @Column({ type: 'decimal', precision: 18, scale: 3, default: 0 })
  exported_quantity: number;

  // Giá và chiết khấu
  @Column({ type: 'decimal', precision: 18, scale: 2 })
  unit_price: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  discount_percent: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  discount_amount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  final_unit_price: number;

  // Thông tin phiếu nhập
  @Column({ type: 'date' })
  import_date: Date;

  @Column({ type: 'time', nullable: true })
  import_time: string;

  @Column({ length: 100, nullable: true })
  invoice_number: string;

  @Column({ length: 50, nullable: true })
  vehicle_number: string;

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

  // Trạng thái
  @Column({ length: 20, default: 'ACTIVE' })
  status: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ nullable: true })
  created_by: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
