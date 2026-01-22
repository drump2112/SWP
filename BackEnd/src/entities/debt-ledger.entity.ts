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
import { Shift } from './shift.entity';

@Entity('debt_ledger')
@Index('idx_debt_ledger_customer', ['customerId', 'createdAt'])
export class DebtLedger {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'customer_id' })
  customerId: number;

  @Column({ name: 'store_id', nullable: true })
  storeId: number;

  @Column({ name: 'shift_id', nullable: true })
  shiftId: number;

  @Column({ name: 'ref_type', length: 50, nullable: true })
  refType: string; // DEBT_SALE (Bán nợ), PAYMENT (Thu tiền), RECEIPT (Thu tiền), ADJUST (Điều chỉnh)

  @Column({ name: 'ref_id', nullable: true })
  refId: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  debit: number; // Phát sinh nợ

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  credit: number; // Thanh toán nợ

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'superseded_by_shift_id', type: 'int', nullable: true })
  supersededByShiftId: number | null; // Nếu != NULL: dữ liệu này đã bị thay thế bởi ca khác

  @Column({ name: 'ledger_at', type: 'timestamp', nullable: true })
  ledgerAt: Date; // Thời gian giao dịch do người dùng chọn (theo closedAt của ca)

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Customer, (customer) => customer.debtLedgers)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @ManyToOne(() => Store)
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @ManyToOne(() => Shift)
  @JoinColumn({ name: 'shift_id' })
  shift: Shift;
}
