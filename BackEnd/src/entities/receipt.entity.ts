import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Store } from './store.entity';
import { Shift } from './shift.entity';
import { ReceiptDetail } from './receipt-detail.entity';

@Entity('receipts')
export class Receipt {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'store_id', nullable: true })
  storeId: number;

  @Column({ name: 'shift_id', nullable: true })
  shiftId: number;

  @Column({ name: 'receipt_type', length: 50, nullable: true })
  receiptType: string; // CASH_SALES (Bán lẻ), DEBT_PAYMENT (Thu nợ)

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    nullable: true,
  })
  amount: number;

  @Column({ name: 'payment_method', length: 20, default: 'CASH' })
  paymentMethod: string; // CASH, BANK_TRANSFER

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Store)
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @ManyToOne(() => Shift, (shift) => shift.receipts)
  @JoinColumn({ name: 'shift_id' })
  shift: Shift;

  @OneToMany(() => ReceiptDetail, (receiptDetail) => receiptDetail.receipt)
  receiptDetails: ReceiptDetail[];
}
