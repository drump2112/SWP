import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { InventoryDocument } from './inventory-document.entity';
import { Product } from './product.entity';
import { Tank } from './tank.entity';

@Entity('inventory_document_items')
export class InventoryDocumentItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'document_id' })
  documentId: number;

  @Column({ name: 'product_id', nullable: true })
  productId: number;

  @Column({ name: 'tank_id', nullable: true })
  tankId: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 3,
    nullable: true,
  })
  quantity: number;

  @Column({
    name: 'unit_price',
    type: 'decimal',
    precision: 18,
    scale: 2,
    nullable: true,
  })
  unitPrice: number;

  @ManyToOne(
    () => InventoryDocument,
    (inventoryDocument) => inventoryDocument.items,
  )
  @JoinColumn({ name: 'document_id' })
  document: InventoryDocument;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ManyToOne(() => Tank)
  @JoinColumn({ name: 'tank_id' })
  tank: Tank;
}
