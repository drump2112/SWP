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

@Entity('cash_ledger')
@Index('idx_cash_ledger_store', ['storeId', 'createdAt'])
export class CashLedger {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'store_id' })
  storeId: number;

  @Column({ name: 'shift_id', nullable: true })
  shiftId: number;

  @Column({ name: 'ref_type', length: 50, nullable: true })
  refType: string; // RECEIPT (Phiếu thu), DEPOSIT (Phiếu nộp), EXPENSE (Chi phí), ADJUST (Điều chỉnh), SHIFT_CLOSE, SHIFT_OPEN, SALE, PAYMENT

  @Column({ name: 'ref_id', nullable: true })
  refId: number;

  @Column({
    name: 'cash_in',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
  })
  cashIn: number;

  @Column({
    name: 'cash_out',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
  })
  cashOut: number;

  @Column({ name: 'superseded_by_shift_id', type: 'int', nullable: true })
  supersededByShiftId: number | null; // Nếu != NULL: dữ liệu này đã bị thay thế bởi ca khác

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Store)
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @ManyToOne(() => Shift)
  @JoinColumn({ name: 'shift_id' })
  shift: Shift;
}
