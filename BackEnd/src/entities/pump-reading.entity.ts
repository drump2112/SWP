import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Shift } from './shift.entity';
import { Product } from './product.entity';
import { Pump } from './pump.entity';

@Entity('pump_readings')
export class PumpReading {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'shift_id' })
  shiftId: number;

  @Column({ name: 'pump_code', length: 50, nullable: true })
  pumpCode: string;

  @Column({ name: 'pump_id', nullable: true })
  pumpId: number;

  @Column({ name: 'product_id', nullable: true })
  productId: number;

  @Column({
    name: 'start_value',
    type: 'decimal',
    precision: 18,
    scale: 3,
    nullable: true,
  })
  startValue: number;

  @Column({
    name: 'end_value',
    type: 'decimal',
    precision: 18,
    scale: 3,
    nullable: true,
  })
  endValue: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 3,
    nullable: true,
  })
  quantity: number;

  @ManyToOne(() => Shift, (shift) => shift.pumpReadings)
  @JoinColumn({ name: 'shift_id' })
  shift: Shift;

  @ManyToOne(() => Product, (product) => product.pumpReadings)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ManyToOne(() => Pump, (pump) => pump.pumpReadings)
  @JoinColumn({ name: 'pump_id' })
  pump: Pump;
}
