import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Shift } from './shift.entity';
import { Store } from './store.entity';
import { Product } from './product.entity';
import { Customer } from './customer.entity';

@Entity('sales')
export class Sale {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'shift_id', nullable: true })
  shiftId: number;

  @Column({ name: 'store_id', nullable: true })
  storeId: number;

  @Column({ name: 'product_id', nullable: true })
  productId: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 3,
    nullable: true,
  })
  quantity: number;

  @Column({
    name: 'unit_price',
    type: 'decimal',
    precision: 18,
    scale: 2,
    nullable: true,
  })
  unitPrice: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    nullable: true,
  })
  amount: number;

  @Column({ name: 'customer_id', nullable: true })
  customerId: number;

  @Column({ name: 'payment_method', length: 20, default: 'CASH' })
  paymentMethod: string; // CASH (Tiền mặt), BANK_TRANSFER (Chuyển khoản), DEBT (Công nợ)

  @ManyToOne(() => Shift, (shift) => shift.sales)
  @JoinColumn({ name: 'shift_id' })
  shift: Shift;

  @ManyToOne(() => Store)
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @ManyToOne(() => Product, (product) => product.sales)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ManyToOne(() => Customer, (customer) => customer.sales)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;
}
