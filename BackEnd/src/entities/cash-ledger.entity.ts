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

@Entity('cash_ledger')
@Index('idx_cash_ledger_store', ['storeId', 'createdAt'])
export class CashLedger {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'store_id' })
  storeId: number;

  @Column({ name: 'ref_type', length: 50, nullable: true })
  refType: string; // RECEIPT, DEPOSIT, ADJUST

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

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Store)
  @JoinColumn({ name: 'store_id' })
  store: Store;
}
