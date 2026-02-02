import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Region } from './region.entity';

@Entity('commercial_warehouses')
export class CommercialWarehouse {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 50 })
  code: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 500, nullable: true })
  address: string;

  @Column({ type: 'decimal', precision: 18, scale: 3, nullable: true })
  capacity: number;

  @Column({ length: 100, nullable: true })
  manager_name: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ nullable: true })
  region_id: number;

  @ManyToOne(() => Region)
  @JoinColumn({ name: 'region_id' })
  region: Region;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
