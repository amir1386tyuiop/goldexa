import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('sell_recommendations')
export class SellRecommendation {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'user_id' })
  userId: string

  @Column({ name: 'asset_id', nullable: true })
  assetId: string | null

  @Column('decimal', { precision: 15, scale: 2, name: 'recommended_price' })
  recommendedPrice: number

  @Column({ name: 'liquidity_score', precision: 5, scale: 2 })
  liquidityScore: number

  @Column()
  reason: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
