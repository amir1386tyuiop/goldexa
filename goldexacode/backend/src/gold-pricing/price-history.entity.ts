import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'
import { GoldPriceType } from './gold-price.entity'

/**
 * Append-only history of gold prices. A new row is written whenever a fetched
 * price differs from the last stored value, so trends can be charted and the
 * source of every quoted price can be audited.
 */
@Entity('price_history')
@Index('idx_price_history_type_time', ['type', 'recordedAt'])
export class PriceHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar', length: 20 })
  type: GoldPriceType

  @Column('decimal', { precision: 15, scale: 2 })
  value: number

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  change: number

  @Column('decimal', { name: 'change_percent', precision: 5, scale: 2, default: 0 })
  changePercent: number

  @Column({ length: 40, default: 'system' })
  source: string

  @Column({ name: 'recorded_at', default: () => 'CURRENT_TIMESTAMP' })
  recordedAt: Date
}
