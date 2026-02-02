import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { CommercialWarehouse } from './commercial-warehouse.entity';
import { CommercialCustomer } from './commercial-customer.entity';
import { User } from './user.entity';
import { ExportOrderItem } from './export-order-item.entity';

@Entity('export_orders')
export class ExportOrder {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 50 })
  order_code: string;

  @Column({ nullable: true })
  warehouse_id: number | null;

  @ManyToOne(() => CommercialWarehouse)
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: CommercialWarehouse;

  // Thông tin đơn hàng (xe bồn)
  @Column({ type: 'date' })
  order_date: Date;

  @Column({ type: 'time', nullable: true })
  order_time: string;

  @Column({ type: 'date', nullable: true })
  delivery_date: Date;

  @Column({ length: 500, nullable: true })
  delivery_address: string;

  @Column({ length: 50, nullable: true })
  vehicle_number: string;

  @Column({ length: 100, nullable: true })
  driver_name: string;

  @Column({ length: 20, nullable: true })
  driver_phone: string;

  // Tổng tiền
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  total_discount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  total_vat: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  total_environmental_tax: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  total_amount: number;

  // Thanh toán
  @Column({ length: 20, default: 'DEBT' })
  payment_method: string;

  @Column({ length: 20, default: 'UNPAID' })
  payment_status: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  paid_amount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  debt_amount: number;

  // Trạng thái
  @Column({ length: 20, default: 'PENDING' })
  status: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ nullable: true })
  created_by: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @Column({ nullable: true })
  approved_by: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'approved_by' })
  approver: User;

  @OneToMany(() => ExportOrderItem, (item) => item.export_order)
  items: ExportOrderItem[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
