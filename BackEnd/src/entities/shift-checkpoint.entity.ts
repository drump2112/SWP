import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Shift } from './shift.entity';
import { User } from './user.entity';

@Entity('shift_checkpoints')
@Index('idx_shift_checkpoints_shift_id', ['shiftId'])
@Index('idx_shift_checkpoints_at', ['checkpointAt'])
export class ShiftCheckpoint {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'shift_id' })
  shiftId: number;

  @Column({ name: 'checkpoint_no', type: 'int', default: 1 })
  checkpointNo: number;

  @Column({ name: 'checkpoint_at', type: 'timestamp' })
  checkpointAt: Date;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'created_by', nullable: true })
  createdBy: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Shift)
  @JoinColumn({ name: 'shift_id' })
  shift: Shift;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @OneToMany('ShiftCheckpointReading', 'checkpoint')
  readings: any[];

  @OneToMany('ShiftCheckpointStock', 'checkpoint')
  stocks: any[];
}
