import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { InventoryDocument } from './inventory-document.entity';

/**
 * Entity lưu tính toán hao hụt và giãn nở của phiếu nhập
 */
@Entity('inventory_loss_calculations')
export class InventoryLossCalculation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'document_id', unique: true })
  documentId: number;

  @Column({
    name: 'expansion_coefficient',
    type: 'decimal',
    precision: 10,
    scale: 6,
    nullable: true,
    comment: 'Hệ số giãn nở (β)',
  })
  expansionCoefficient: number;

  @Column({
    name: 'loss_coefficient',
    type: 'decimal',
    precision: 10,
    scale: 6,
    nullable: true,
    comment: 'Hệ số hao hụt vận chuyển (α)',
  })
  lossCoefficient: number;

  @Column({
    name: 'total_truck_volume',
    type: 'decimal',
    precision: 18,
    scale: 3,
    nullable: true,
    comment: 'Tổng thể tích tại xe téc (lít)',
  })
  totalTruckVolume: number;

  @Column({
    name: 'total_actual_volume',
    type: 'decimal',
    precision: 18,
    scale: 3,
    nullable: true,
    comment: 'Tổng thể tích thực tế (lít)',
  })
  totalActualVolume: number;

  @Column({
    name: 'total_received_volume',
    type: 'decimal',
    precision: 18,
    scale: 3,
    nullable: true,
    comment: 'Tổng lượng thực nhận (lít)',
  })
  totalReceivedVolume: number;

  @Column({
    name: 'total_loss_volume',
    type: 'decimal',
    precision: 18,
    scale: 3,
    nullable: true,
    comment: 'Tổng hao hụt (lít)',
  })
  totalLossVolume: number;

  @Column({
    name: 'allowed_loss_volume',
    type: 'decimal',
    precision: 18,
    scale: 3,
    nullable: true,
    comment: 'Hao hụt cho phép (lít)',
  })
  allowedLossVolume: number;

  @Column({
    name: 'excess_shortage_volume',
    type: 'decimal',
    precision: 18,
    scale: 3,
    nullable: true,
    comment: 'Lượng thừa/thiếu (lít) - Dương: thừa, Âm: thiếu',
  })
  excessShortageVolume: number;

  @Column({
    name: 'temperature_adjustment_volume',
    type: 'decimal',
    precision: 18,
    scale: 3,
    nullable: true,
    comment: 'Lượng điều chỉnh do nhiệt độ (lít)',
  })
  temperatureAdjustmentVolume: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => InventoryDocument)
  @JoinColumn({ name: 'document_id' })
  document: InventoryDocument;
}
