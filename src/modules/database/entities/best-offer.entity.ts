import { Entity, PrimaryColumn, Column, UpdateDateColumn, Index, Unique, BeforeInsert } from 'typeorm';
import { uuidv7 } from '../../../common/utils/uuidv7';

@Entity('best_offers')
@Unique(['city', 'name'])
export class BestOffer {
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

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'varchar', length: 100 })
  supplier: string;

  @Column({ type: 'numeric', precision: 5, scale: 2 })
  commissionPct: number;

  @UpdateDateColumn()
  updatedAt: Date;
}
