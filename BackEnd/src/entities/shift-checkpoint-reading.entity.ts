import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { ShiftCheckpoint } from './shift-checkpoint.entity';
import { Pump } from './pump.entity';
import { Product } from './product.entity';

@Entity('shift_checkpoint_readings')
@Index('idx_checkpoint_readings_checkpoint_id', ['checkpointId'])
@Index('idx_checkpoint_readings_pump_id', ['pumpId'])
export class ShiftCheckpointReading {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'checkpoint_id' })
  checkpointId: number;

  @Column({ name: 'pump_id', nullable: true })
  pumpId: number | null;

  @Column({ name: 'pump_code', type: 'varchar', length: 50, nullable: true })
  pumpCode: string | null;

  @Column({ name: 'product_id' })
  productId: number;

  @Column({ name: 'meter_value', type: 'decimal', precision: 15, scale: 2 })
  meterValue: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => ShiftCheckpoint, (checkpoint) => checkpoint.readings)
  @JoinColumn({ name: 'checkpoint_id' })
  checkpoint: ShiftCheckpoint;

  @ManyToOne(() => Pump)
  @JoinColumn({ name: 'pump_id' })
  pump: Pump;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;
}
