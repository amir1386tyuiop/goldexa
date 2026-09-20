import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

@Entity('platform_revenue')
@Index('idx_platform_revenue_source_unique', ['sourceType', 'sourceId'], { unique: true })
export class PlatformRevenue {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'source_type', length: 50 })
  sourceType: string

  @Column({ name: 'source_id' })
  sourceId: string

  @Column('decimal', { precision: 15, scale: 2 })
  amount: number

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
