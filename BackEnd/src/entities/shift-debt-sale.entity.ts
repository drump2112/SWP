import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Shift } from './shift.entity';
import { Customer } from './customer.entity';
import { Product } from './product.entity';

@Entity('shift_debt_sales')
@Index('idx_shift_debt_sales_shift', ['shiftId'])
@Index('idx_shift_debt_sales_customer', ['customerId'])
@Index('idx_shift_debt_sales_product', ['productId'])
export class ShiftDebtSale {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'shift_id' })
  shiftId: number;

  @Column({ name: 'customer_id' })
  customerId: number;

  @Column({ name: 'product_id' })
  productId: number;

  @Column({ type: 'decimal', precision: 18, scale: 3 })
  quantity: number;

  @Column({ name: 'unit_price', type: 'decimal', precision: 18, scale: 2 })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Shift)
  @JoinColumn({ name: 'shift_id' })
  shift: Shift;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;
}
