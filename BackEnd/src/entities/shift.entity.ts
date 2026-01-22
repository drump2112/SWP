import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
  CreateDateColumn,
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

  @Column({ name: 'version', type: 'int', default: 1 })
  version: number; // Version của ca (mỗi lần reopen + close tăng lên 1)

  @Column({ name: 'adjusted_from_shift_id', type: 'int', nullable: true })
  adjustedFromShiftId: number | null; // ID của ca gốc (nếu là ca điều chỉnh)

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean; // false nếu đã bị supersede bởi version mới

  @Column({ name: 'handover_name', type: 'varchar', length: 255, nullable: true })
  handoverName: string | null; // Tên người giao ca

  @Column({ name: 'receiver_name', type: 'varchar', length: 255, nullable: true })
  receiverName: string | null; // Tên người nhận ca

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

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
