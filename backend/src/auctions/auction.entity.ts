import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { Product } from '../products/product.entity'

export enum AuctionStatus {
  PENDING_REVIEW = 'pending_review',
  SCHEDULED = 'scheduled',
  ACTIVE = 'active',
  EXTENDED = 'extended',
  ENDED = 'ended',
  AWAITING_PAYMENT = 'awaiting_payment',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
}

export enum AuctionPaymentStatus {
  UNPAID = 'unpaid',
  ESCROW_HELD = 'escrow_held',
  PAID = 'paid',
  SETTLED = 'settled',
  REFUNDED = 'refunded',
  FAILED = 'failed',
}

export enum AuctionQualityStatus {
  NOT_SENT = 'not_sent',
  RECEIVED = 'received',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum BidIncrementType {
  AMOUNT = 'amount',
  PERCENT = 'percent',
}

export enum AuctionShippingMethod {
  POST = 'post',
  TIPEX = 'tipex',
  COURIER = 'courier',
}

@Entity('auctions')
export class Auction {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @ManyToOne(() => Product, { eager: true, nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product

  @Column({ name: 'product_id', nullable: true })
  productId: string | null

  @Column({ default: false, name: 'inventory_reserved' })
  inventoryReserved: boolean

  @Column({ name: 'seller_id' })
  sellerId: string

  @Column({ name: 'seller_name' })
  sellerName: string

  @Column({
    type: 'enum',
    enum: AuctionStatus,
    default: AuctionStatus.PENDING_REVIEW,
  })
  status: AuctionStatus

  @Column({
    type: 'enum',
    enum: AuctionPaymentStatus,
    default: AuctionPaymentStatus.UNPAID,
    name: 'payment_status',
  })
  paymentStatus: AuctionPaymentStatus

  @Column({
    type: 'enum',
    enum: AuctionQualityStatus,
    default: AuctionQualityStatus.NOT_SENT,
    name: 'quality_status',
  })
  qualityStatus: AuctionQualityStatus

  @Column({ default: false, name: 'quality_badge' })
  qualityBadge: boolean

  @Column({ name: 'expert_id', nullable: true })
  expertId: string | null

  @Column({ name: 'expert_name', nullable: true })
  expertName: string | null

  @Column('text', { nullable: true, name: 'expert_notes' })
  expertNotes: string | null

  @Column('decimal', { precision: 15, scale: 2, name: 'starting_price' })
  startingPrice: number

  @Column('decimal', { precision: 15, scale: 2, nullable: true, name: 'gold18_price_snapshot' })
  gold18PriceSnapshot: number | null

  @Column('decimal', { precision: 15, scale: 2, nullable: true, name: 'intrinsic_gold_value' })
  intrinsicGoldValue: number | null

  @Column({ type: 'timestamp', nullable: true, name: 'price_snapshot_at' })
  priceSnapshotAt: Date | null

  @Column('decimal', { precision: 15, scale: 2, default: 0, name: 'reserve_price' })
  reservePrice: number | null

  @Column('decimal', { precision: 15, scale: 2, default: 0, name: 'current_price' })
  currentPrice: number

  @Column({
    type: 'enum',
    enum: BidIncrementType,
    default: BidIncrementType.AMOUNT,
    name: 'bid_increment_type',
  })
  bidIncrementType: BidIncrementType

  @Column('decimal', { precision: 15, scale: 2, default: 0, name: 'minimum_bid_increment' })
  minimumBidIncrement: number

  @Column('decimal', { precision: 5, scale: 2, default: 0, name: 'bid_increment_percent' })
  bidIncrementPercent: number

  @Column({ default: 0, name: 'bid_count' })
  bidCount: number

  @Column({ default: 3, name: 'duration_days' })
  durationDays: number

  @Column({ default: 0, name: 'auto_extend_minutes' })
  autoExtendMinutes: number

  @Column({ default: 0, name: 'auto_extend_seconds' })
  autoExtendSeconds: number

  @Column({ default: 1440, name: 'payment_window_minutes' })
  paymentWindowMinutes: number

  @Column({ name: 'payment_deadline_at', nullable: true })
  paymentDeadlineAt: Date | null

  @Column('decimal', { precision: 5, scale: 2, default: 0, name: 'commission_rate' })
  commissionRate: number

  @Column('decimal', { precision: 15, scale: 2, default: 0, name: 'commission_amount' })
  commissionAmount: number

  @Column({
    type: 'enum',
    enum: AuctionShippingMethod,
    default: AuctionShippingMethod.COURIER,
    name: 'shipping_method',
  })
  shippingMethod: AuctionShippingMethod

  @Column('decimal', { precision: 15, scale: 2, default: 0, name: 'shipping_cost' })
  shippingCost: number

  @Column({ default: false, name: 'reserve_met' })
  reserveMet: boolean

  @Column({ nullable: true, name: 'winning_bidder_id' })
  winningBidderId: string | null

  @Column({ nullable: true, name: 'winning_bidder_name' })
  winningBidderName: string | null

  @Column('decimal', { precision: 15, scale: 2, default: 0, name: 'winning_amount' })
  winningAmount: number | null

  @Column({ nullable: true, name: 'second_winner_id' })
  secondWinnerId: string | null

  @Column({ nullable: true, name: 'second_winner_name' })
  secondWinnerName: string | null

  @Column('decimal', { precision: 15, scale: 2, default: 0, name: 'second_winner_amount' })
  secondWinnerAmount: number | null

  @Column({ default: true, name: 'is_featured' })
  isFeatured: boolean

  @Column('text', { nullable: true })
  notes: string | null

  @Column({ name: 'starts_at' })
  startsAt: Date

  @Column({ name: 'ends_at' })
  endsAt: Date

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
