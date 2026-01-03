import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Store } from './store.entity';

@Entity('shifts')
@Index('ux_shift_store_date', ['storeId', 'shiftDate', 'shiftNo'], {
  unique: true,
})
export class Shift {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'store_id' })
  storeId: number;

  @Column({ name: 'shift_date', type: 'date' })
  shiftDate: Date;

  @Column({ name: 'shift_no', type: 'int' })
  shiftNo: number;

  @Column({ name: 'opened_at', type: 'timestamp', nullable: true })
  openedAt: Date | null;

  @Column({ name: 'closed_at', type: 'timestamp', nullable: true })
  closedAt: Date | null;

  @Column({ length: 20, default: 'OPEN' })
  status: string; // OPEN, CLOSED, ADJUSTED

  @ManyToOne(() => Store, (store) => store.shifts)
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @OneToMany('PumpReading', 'shift')
  pumpReadings: any[];

  @OneToMany('Sale', 'shift')
  sales: any[];

  @OneToMany('Receipt', 'shift')
  receipts: any[];
}
