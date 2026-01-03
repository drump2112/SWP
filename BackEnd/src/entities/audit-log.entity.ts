import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'table_name', length: 100, nullable: true })
  tableName: string;

  @Column({ name: 'record_id', nullable: true })
  recordId: number;

  @Column({ length: 20, nullable: true })
  action: string; // INSERT, UPDATE, DELETE

  @Column({ name: 'old_data', type: 'jsonb', nullable: true })
  oldData: any;

  @Column({ name: 'new_data', type: 'jsonb', nullable: true })
  newData: any;

  @Column({ name: 'changed_by', nullable: true })
  changedBy: number;

  @CreateDateColumn({ name: 'changed_at' })
  changedAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'changed_by' })
  user: User;
}
