import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'

export enum UsedGoldListingSaleType {
  DIRECT = 'direct',
  AUCTION = 'auction',
}

export enum UsedGoldListingStatus {
  DRAFT = 'draft',
  PENDING_REVIEW = 'pending_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ACTIVE = 'active',
  SOLD = 'sold',
  CANCELLED = 'cancelled',
}

export enum UsedGoldQualityStatus {
  NOT_SENT = 'not_sent',
  RECEIVED = 'received',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum UsedGoldSource {
  MANUAL = 'manual',
  GOLDEKSA_PURCHASE = 'goldeksa_purchase',
}

@Entity('used_gold_listings')
export class UsedGoldListing {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'seller_id' })
  sellerId: string

  @Column({ name: 'seller_name' })
  sellerName: string

  @Column({ name: 'product_id', nullable: true })
  productId: string | null

  @Column({ name: 'order_id', nullable: true })
  orderId: string | null

  @Column({
    type: 'enum',
    enum: UsedGoldSource,
    default: UsedGoldSource.MANUAL,
    name: 'source',
  })
  source: UsedGoldSource

  @Column()
  title: string

  @Column('text')
  description: string

  @Column('decimal', { precision: 10, scale: 2 })
  weight: number

  @Column({ type: 'int', default: 18 })
  karat: number

  @Column('simple-json', { nullable: true })
  stones: unknown[] | null

  @Column('simple-json', { nullable: true })
  dimensions: unknown

  @Column({ name: 'metal_color', nullable: true })
  metalColor: string | null

  @Column({ name: 'lock_type', nullable: true })
  lockType: string | null

  @Column('simple-array', { default: '' })
  images: string[]

  @Column({ nullable: true })
  video: string | null

  @Column({
    type: 'enum',
    enum: UsedGoldListingSaleType,
    default: UsedGoldListingSaleType.DIRECT,
    name: 'sale_type',
  })
  saleType: UsedGoldListingSaleType

  @Column('decimal', { precision: 15, scale: 2, default: 0, name: 'fixed_price' })
  fixedPrice: number | null

  @Column('decimal', { precision: 15, scale: 2, default: 0, name: 'starting_price' })
  startingPrice: number | null

  @Column('decimal', { precision: 15, scale: 2, default: 0, name: 'reserve_price' })
  reservePrice: number | null

  @Column('decimal', { precision: 15, scale: 2, default: 0, name: 'minimum_bid_increment' })
  minimumBidIncrement: number | null

  @Column({ default: 3, name: 'auction_duration_days' })
  auctionDurationDays: number | null

  @Column({ default: false, name: 'auto_extend_enabled' })
  autoExtendEnabled: boolean

  @Column({ default: 2, name: 'auto_extend_minutes' })
  autoExtendMinutes: number

  @Column({ default: 300, name: 'auto_extend_seconds' })
  autoExtendSeconds: number

  @Column({ default: 1440, name: 'payment_window_minutes' })
  paymentWindowMinutes: number

  @Column('decimal', { precision: 5, scale: 2, default: 0, name: 'commission_rate' })
  commissionRate: number

  @Column({
    type: 'enum',
    enum: UsedGoldQualityStatus,
    default: UsedGoldQualityStatus.NOT_SENT,
    name: 'quality_status',
  })
  qualityStatus: UsedGoldQualityStatus

  @Column({ default: false, name: 'quality_badge' })
  qualityBadge: boolean

  @Column({ name: 'expert_id', nullable: true })
  expertId: string | null

  @Column({ name: 'expert_name', nullable: true })
  expertName: string | null

  @Column('text', { nullable: true, name: 'expert_notes' })
  expertNotes: string | null

  @Column({
    type: 'enum',
    enum: UsedGoldListingStatus,
    default: UsedGoldListingStatus.PENDING_REVIEW,
  })
  status: UsedGoldListingStatus

  @Column({ default: 0, name: 'view_count' })
  viewCount: number

  @Column({ default: 0, name: 'favorite_count' })
  favoriteCount: number

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
