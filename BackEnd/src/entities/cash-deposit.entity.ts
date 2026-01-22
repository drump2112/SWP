import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Store } from './store.entity';
import { Shift } from './shift.entity';
import { User } from './user.entity';

@Entity('cash_deposits')
@Index('idx_cash_deposits_store', ['storeId', 'depositAt'])
@Index('idx_cash_deposits_shift', ['shiftId'])
export class CashDeposit {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'store_id' })
  storeId: number;

  @Column({ name: 'shift_id', nullable: true })
  shiftId: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: number;

  @Column({ name: 'deposit_at', type: 'timestamp', nullable: true })
  depositAt: Date; // Thời gian nộp tiền do người dùng chọn

  @Column({ name: 'receiver_name', length: 100, nullable: true })
  receiverName: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'payment_method', length: 20, default: 'CASH' })
  paymentMethod: string; // CASH (nộp tiền mặt), BANK_TRANSFER (chuyển khoản)

  @Column({ name: 'created_by', nullable: true })
  createdBy: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Store)
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @ManyToOne(() => Shift)
  @JoinColumn({ name: 'shift_id' })
  shift: Shift;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;
}
