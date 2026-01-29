import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Store } from './store.entity';
import { Shift } from './shift.entity';
import { User } from './user.entity';

/**
 * Entity lưu biên bản kiểm kê tồn kho xăng dầu
 */
@Entity('inventory_checks')
@Index('idx_inventory_checks_store_id', ['storeId'])
@Index('idx_inventory_checks_check_at', ['checkAt'])
@Index('idx_inventory_checks_shift_id', ['shiftId'])
export class InventoryCheck {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'store_id' })
  storeId: number;

  @Column({ name: 'shift_id', nullable: true })
  shiftId: number | null;

  @Column({ name: 'check_at', type: 'timestamp', default: () => 'NOW()' })
  checkAt: Date;

  // Thành viên kiểm kê
  @Column({ name: 'member1_name', type: 'varchar', length: 100, nullable: true })
  member1Name: string | null;

  @Column({ name: 'member2_name', type: 'varchar', length: 100, nullable: true })
  member2Name: string | null;

  // Chi tiết kiểm kê (lưu JSON)
  @Column({ name: 'tank_data', type: 'jsonb', nullable: true })
  tankData: any; // [{tankId, tankCode, productName, heightTotal, heightWater, actualStock, bookStock, difference}]

  @Column({ name: 'pump_data', type: 'jsonb', nullable: true })
  pumpData: any; // [{pumpId, pumpCode, tankId, meterReading}] ✅ tankId dùng để match vòi bơm với bể tương ứng

  // Kết luận
  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ type: 'text', nullable: true })
  conclusion: string | null;

  // Tổng hợp nhanh
  @Column({ name: 'total_difference', type: 'decimal', precision: 15, scale: 3, default: 0 })
  totalDifference: number;

  // Audit
  @Column({ type: 'varchar', length: 20, default: 'DRAFT' })
  status: string;

  @Column({ name: 'created_by', nullable: true })
  createdBy: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
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
