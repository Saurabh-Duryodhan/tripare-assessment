import { Entity, PrimaryColumn, Column, CreateDateColumn, Index, BeforeInsert } from 'typeorm';
import { uuidv7 } from '../../../common/utils/uuidv7';

@Entity('search_audits')
export class SearchAudit {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv7();
    }
  }

  @Index()
  @Column({ type: 'varchar', length: 100 })
  city: string;

  @Column({ type: 'numeric', nullable: true, precision: 10, scale: 2 })
  minPrice: number | null;

  @Column({ type: 'numeric', nullable: true, precision: 10, scale: 2 })
  maxPrice: number | null;

  @Column({ type: 'int' })
  resultCount: number;

  @Column({ type: 'varchar', length: 50, default: 'TEMPORAL_WORKFLOW' })
  source: string;

  @Column({ type: 'int', default: 0 })
  latencyMs: number;

  @CreateDateColumn()
  createdAt: Date;
}
