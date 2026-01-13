import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Receipt } from './receipt.entity';
import { Customer } from './customer.entity';
@Entity('receipt_details')
export class ReceiptDetail {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'receipt_id' })
  receiptId: number;

  @Column({ name: 'customer_id', nullable: true })
  customerId: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    nullable: true,
  })
  amount: number;

  @ManyToOne(() => Receipt, (receipt) => receipt.receiptDetails)
  @JoinColumn({ name: 'receipt_id' })
  receipt: Receipt;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;
}
