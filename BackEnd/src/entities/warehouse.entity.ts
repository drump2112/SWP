import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Store } from './store.entity';
import { InventoryLedger } from './inventory-ledger.entity';

@Entity('warehouses')
export class Warehouse {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 20, nullable: true })
  type: string; // COMPANY / STORE

  @Column({ name: 'store_id', nullable: true })
  storeId: number;

  @ManyToOne(() => Store, (store) => store.warehouses)
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @OneToMany(
    () => InventoryLedger,
    (inventoryLedger) => inventoryLedger.warehouse,
  )
  inventoryLedgers: InventoryLedger[];
}
