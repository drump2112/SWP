import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';

export enum ProductCategory {
  GASOLINE = 'GASOLINE', // Xăng
  DIESEL = 'DIESEL', // Dầu
}

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

  @Column({
    type: 'varchar',
    length: 20,
    default: 'GASOLINE',
  })
  category: ProductCategory;

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
