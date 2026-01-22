import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Store } from './store.entity';
import { Tank } from './tank.entity';
import { User } from './user.entity';
import { StoreLossConfig } from './store-loss-config.entity';

@Entity('inventory_closing')
export class InventoryClosing {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'store_id' })
  storeId: number;

  @Column({ name: 'tank_id' })
  tankId: number;

  @Column({ name: 'period_from', type: 'date' })
  periodFrom: Date;

  @Column({ name: 'period_to', type: 'date' })
  periodTo: Date;

  @Column({ name: 'closing_date', type: 'timestamp' })
  closingDate: Date;

  @Column({ name: 'opening_balance', type: 'decimal', precision: 15, scale: 3 })
  openingBalance: number;

  @Column({ name: 'import_quantity', type: 'decimal', precision: 15, scale: 3, default: 0 })
  importQuantity: number;

  @Column({ name: 'export_quantity', type: 'decimal', precision: 15, scale: 3, default: 0 })
  exportQuantity: number;

  @Column({ name: 'loss_rate', type: 'decimal', precision: 10, scale: 6, default: 0 })
  lossRate: number;

  @Column({ name: 'loss_amount', type: 'decimal', precision: 15, scale: 3, default: 0 })
  lossAmount: number;

  @Column({ name: 'closing_balance', type: 'decimal', precision: 15, scale: 3 })
  closingBalance: number;

  @Column({ name: 'loss_config_id', nullable: true })
  lossConfigId: number | null;

  @Column({ name: 'product_category', type: 'varchar', length: 20, nullable: true })
  productCategory: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'created_by', nullable: true })
  createdBy: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => Store)
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @ManyToOne(() => Tank)
  @JoinColumn({ name: 'tank_id' })
  tank: Tank;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @ManyToOne(() => StoreLossConfig)
  @JoinColumn({ name: 'loss_config_id' })
  lossConfig: StoreLossConfig;
}
