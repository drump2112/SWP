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
import { Tank } from './tank.entity';
import { Product } from './product.entity';

@Entity('shift_checkpoint_stocks')
@Index('idx_checkpoint_stocks_checkpoint_id', ['checkpointId'])
@Index('idx_checkpoint_stocks_tank_id', ['tankId'])
export class ShiftCheckpointStock {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'checkpoint_id' })
  checkpointId: number;

  @Column({ name: 'tank_id' })
  tankId: number;

  @Column({ name: 'product_id', nullable: true })
  productId: number | null;

  @Column({ name: 'system_quantity', type: 'decimal', precision: 15, scale: 2, nullable: true })
  systemQuantity: number | null;

  @Column({ name: 'actual_quantity', type: 'decimal', precision: 15, scale: 2 })
  actualQuantity: number;

  // difference is a generated column in DB, but we need to map it
  @Column({ name: 'difference', type: 'decimal', precision: 15, scale: 2, nullable: true, insert: false, update: false })
  difference: number | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => ShiftCheckpoint, (checkpoint) => checkpoint.stocks)
  @JoinColumn({ name: 'checkpoint_id' })
  checkpoint: ShiftCheckpoint;

  @ManyToOne(() => Tank)
  @JoinColumn({ name: 'tank_id' })
  tank: Tank;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;
}
