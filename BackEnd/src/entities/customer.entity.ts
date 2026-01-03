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

  @Column({ name: 'credit_limit', type: 'decimal', precision: 15, scale: 2, nullable: true })
  creditLimit: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @OneToMany('CustomerStore', 'customer')
  customerStores: any[];

  @OneToMany('DebtLedger', 'customer')
  debtLedgers: any[];

  @OneToMany('Sale', 'customer')
  sales: any[];
}
