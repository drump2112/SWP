import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Customer } from './customer.entity';
import { Store } from './store.entity';

@Entity('debt_ledger')
@Index('idx_debt_ledger_customer', ['customerId', 'createdAt'])
export class DebtLedger {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'customer_id' })
  customerId: number;

  @Column({ name: 'store_id', nullable: true })
  storeId: number;

  @Column({ name: 'ref_type', length: 50, nullable: true })
  refType: string; // SALE, PAYMENT, ADJUST

  @Column({ name: 'ref_id', nullable: true })
  refId: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  debit: number; // Phát sinh nợ

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  credit: number; // Thanh toán nợ

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Customer, (customer) => customer.debtLedgers)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @ManyToOne(() => Store)
  @JoinColumn({ name: 'store_id' })
  store: Store;
}
