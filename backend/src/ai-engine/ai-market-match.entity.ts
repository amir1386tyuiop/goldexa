import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

export enum AiMatchStatus {
  PENDING = 'pending',
  SENT = 'sent',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

@Entity('ai_market_matches')
export class AiMarketMatch {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'buyer_id' })
  buyerId: string

  @Column({ name: 'seller_id' })
  sellerId: string

  @Column({ name: 'listing_id', nullable: true })
  listingId: string | null

  @Column('decimal', { precision: 5, scale: 2 })
  score: number

  @Column()
  reason: string

  @Column({
    type: 'enum',
    enum: AiMatchStatus,
    default: AiMatchStatus.PENDING,
  })
  status: AiMatchStatus

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
