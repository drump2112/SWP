import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Warehouse } from './warehouse.entity';
import { Shift } from './shift.entity';
import { InventoryDocumentItem } from './inventory-document-item.entity';

@Entity('inventory_documents')
export class InventoryDocument {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'warehouse_id', nullable: true })
  warehouseId: number;

  @Column({ name: 'doc_type', length: 50, nullable: true })
  docType: string; // IMPORT, EXPORT, TRANSFER, ADJUST

  @Column({ name: 'doc_date', type: 'date', nullable: true })
  docDate: Date;

  @Column({ name: 'ref_shift_id', nullable: true })
  refShiftId: number;

  @Column({ length: 20, nullable: true })
  status: string;

  @ManyToOne(() => Warehouse)
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: Warehouse;

  @ManyToOne(() => Shift)
  @JoinColumn({ name: 'ref_shift_id' })
  refShift: Shift;

  @OneToMany(
    () => InventoryDocumentItem,
    (inventoryDocumentItem) => inventoryDocumentItem.document,
  )
  items: InventoryDocumentItem[];
}
