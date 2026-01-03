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
import { Product } from './product.entity';

@Entity('tanks')
export class Tank {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'store_id' })
  storeId: number;

  @Column({ name: 'tank_code', length: 50 })
  tankCode: string;

  @Column({ length: 200 })
  name: string;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 3,
    comment: 'Dung tích tối đa (lít)',
  })
  capacity: number;

  @Column({ name: 'product_id' })
  productId: number;

  @Column({
    name: 'current_stock',
    type: 'decimal',
    precision: 18,
    scale: 3,
    default: 0,
    comment: 'Tồn kho hiện tại (lít)',
  })
  currentStock: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Store, (store) => store.tanks)
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @ManyToOne(() => Product, (product) => product.tanks)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @OneToMany('Pump', 'tank')
  pumps: any[];
}
