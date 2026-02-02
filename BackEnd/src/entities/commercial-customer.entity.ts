import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CommercialCustomerGroup } from './commercial-customer-group.entity';

@Entity('commercial_customers')
export class CommercialCustomer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 50 })
  code: string;

  @Column({ length: 255 })
  name: string;

  @Column({ nullable: true })
  customer_group_id: number;

  @ManyToOne(() => CommercialCustomerGroup)
  @JoinColumn({ name: 'customer_group_id' })
  customer_group: CommercialCustomerGroup;

  @Column({ length: 50, nullable: true })
  tax_code: string;

  @Column({ length: 500, nullable: true })
  address: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ length: 100, nullable: true })
  email: string;

  @Column({ length: 100, nullable: true })
  contact_person: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  credit_limit: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  current_debt: number;

  @Column({ length: 100, nullable: true })
  payment_terms: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
