import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

export enum LiquidityRequestStatus {
  DRAFT = 'draft',
  PENDING_REVIEW = 'pending_review',
  MATCHED = 'matched',
  SOLD = 'sold',
  CANCELLED = 'cancelled',
}

@Entity('liquidity_requests')
export class LiquidityRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'user_id' })
  userId: string

  @Column({ name: 'asset_id', nullable: true })
  assetId: string | null

  @Column({ name: 'listing_id', nullable: true })
  listingId: string | null

  @Column('decimal', { name: 'expected_price', precision: 15, scale: 2 })
  expectedPrice: number

  @Column({
    type: 'enum',
    enum: LiquidityRequestStatus,
    default: LiquidityRequestStatus.DRAFT,
  })
  status: LiquidityRequestStatus

  @Column({ nullable: true })
  notes: string | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
