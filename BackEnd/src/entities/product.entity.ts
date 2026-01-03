import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 50, nullable: true })
  code: string;

  @Column({ length: 255, nullable: true })
  name: string;

  @Column({ length: 50, nullable: true })
  unit: string;

  @Column({ name: 'is_fuel', type: 'boolean', default: false })
  isFuel: boolean;

  @OneToMany('ProductPrice', 'product')
  productPrices: any[];

  @OneToMany('PumpReading', 'product')
  pumpReadings: any[];

  @OneToMany('Sale', 'product')
  sales: any[];

  @OneToMany('Tank', 'product')
  tanks: any[];

  @OneToMany('Pump', 'product')
  pumps: any[];
}
