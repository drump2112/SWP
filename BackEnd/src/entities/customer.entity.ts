import { Entity, PrimaryGeneratedColumn, Column, OneToMany, BeforeInsert } from 'typeorm';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 50 })
  code: string;

  @Column({ length: 255, nullable: true })
  name: string;

  @Column({ name: 'tax_code', length: 50, nullable: true })
  taxCode: string;

  @Column({ length: 500, nullable: true })
  address: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ length: 20, default: 'EXTERNAL' })
  type: string; // EXTERNAL, INTERNAL

  @Column({ name: 'credit_limit', type: 'decimal', precision: 15, scale: 2, nullable: true })
  creditLimit: number;

  @Column({ name: 'bypass_credit_limit', type: 'boolean', default: false })
  bypassCreditLimit: boolean;

  @Column({ name: 'bypass_until', type: 'timestamp', nullable: true })
  bypassUntil: Date | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @OneToMany('CustomerStore', 'customer')
  customerStores: any[];

  @OneToMany('DebtLedger', 'customer')
  debtLedgers: any[];

  @OneToMany('Sale', 'customer')
  sales: any[];
}
