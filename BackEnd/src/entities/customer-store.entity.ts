import { Entity, PrimaryColumn, ManyToOne, JoinColumn, Column } from 'typeorm';
import { Customer } from './customer.entity';
import { Store } from './store.entity';

@Entity('customer_stores')
export class CustomerStore {
  @PrimaryColumn({ name: 'customer_id' })
  customerId: number;

  @PrimaryColumn({ name: 'store_id' })
  storeId: number;

  @Column({ name: 'credit_limit', type: 'decimal', precision: 15, scale: 2, nullable: true })
  creditLimit: number | null;

  @ManyToOne(() => Customer, (customer) => customer.customerStores)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @ManyToOne(() => Store)
  @JoinColumn({ name: 'store_id' })
  store: Store;
}
