import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Warehouse } from './warehouse.entity';
import { Product } from './product.entity';

@Entity('inventory_ledger')
@Index('idx_inventory_ledger_lookup', ['warehouseId', 'productId', 'createdAt'])
export class InventoryLedger {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'warehouse_id' })
  warehouseId: number;

  @Column({ name: 'product_id' })
  productId: number;

  @Column({ name: 'ref_type', length: 50, nullable: true })
  refType: string;

  @Column({ name: 'ref_id', nullable: true })
  refId: number;

  @Column({
    name: 'quantity_in',
    type: 'decimal',
    precision: 18,
    scale: 3,
    default: 0,
  })
  quantityIn: number;

  @Column({
    name: 'quantity_out',
    type: 'decimal',
    precision: 18,
    scale: 3,
    default: 0,
  })
  quantityOut: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Warehouse, (warehouse) => warehouse.inventoryLedgers)
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: Warehouse;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;
}
