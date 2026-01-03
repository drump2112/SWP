import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';

@Entity('regions')
export class Region {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @OneToMany('Store', 'region')
  stores: any[];

  @OneToMany('ProductPrice', 'region')
  productPrices: any[];
}
