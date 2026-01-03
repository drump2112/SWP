import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Product } from './product.entity';
import { Region } from './region.entity';

@Entity('product_prices')
@Index('idx_product_prices_lookup', [
  'productId',
  'regionId',
  'validFrom',
  'validTo',
])
export class ProductPrice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'product_id' })
  productId: number;

  @Column({ name: 'region_id' })
  regionId: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  price: number;

  @Column({ name: 'valid_from', type: 'timestamp' })
  validFrom: Date;

  @Column({ name: 'valid_to', type: 'timestamp', nullable: true })
  validTo: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Product, (product) => product.productPrices)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ManyToOne(() => Region, (region) => region.productPrices)
  @JoinColumn({ name: 'region_id' })
  region: Region;
}
