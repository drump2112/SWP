import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Shift } from './shift.entity';
import { User } from './user.entity';

@Entity('shift_adjustments')
export class ShiftAdjustment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'shift_id' })
  shiftId: number;

  @Column({ name: 'adjustment_type', length: 50, nullable: true })
  adjustmentType: string; // INVENTORY / CASH / DEBT

  @Column({ type: 'text', nullable: true })
  reason: string;

  @Column({ name: 'created_by', nullable: true })
  createdBy: number;

  @Column({ name: 'approved_by', nullable: true })
  approvedBy: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Shift)
  @JoinColumn({ name: 'shift_id' })
  shift: Shift;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'approved_by' })
  approver: User;
}
