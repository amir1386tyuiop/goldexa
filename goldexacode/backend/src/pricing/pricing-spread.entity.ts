import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('pricing_spreads')
export class PricingSpread {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'product_category' })
  productCategory: string

  @Column('decimal', { name: 'spread_percent', precision: 5, scale: 2 })
  spreadPercent: number

  @Column({ default: true, name: 'is_active' })
  isActive: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
