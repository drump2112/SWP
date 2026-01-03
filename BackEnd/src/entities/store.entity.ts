import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Region } from './region.entity';

@Entity('stores')
export class Store {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 50, nullable: true })
  code: string;

  @Column({ length: 255, nullable: true })
  name: string;

  @Column({ name: 'region_id', nullable: true })
  regionId: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string;

  @ManyToOne(() => Region, (region) => region.stores)
  @JoinColumn({ name: 'region_id' })
  region: Region;

  @OneToMany('Shift', 'store')
  shifts: any[];

  @OneToMany('Warehouse', 'store')
  warehouses: any[];

  @OneToMany('Tank', 'store')
  tanks: any[];

  @OneToMany('Pump', 'store')
  pumps: any[];
}
