import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Store } from './store.entity';
import { Tank } from './tank.entity';
import { Product } from './product.entity';

@Entity('pumps')
export class Pump {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'store_id' })
  storeId: number;

  @Column({ name: 'tank_id' })
  tankId: number;

  @Column({ name: 'pump_code', length: 50 })
  pumpCode: string;

  @Column({ length: 200 })
  name: string;

  @Column({ name: 'product_id' })
  productId: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Store, (store) => store.pumps)
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @ManyToOne(() => Tank, (tank) => tank.pumps)
  @JoinColumn({ name: 'tank_id' })
  tank: Tank;

  @ManyToOne(() => Product, (product) => product.pumps)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @OneToMany('PumpReading', 'pump')
  pumpReadings: any[];
}
