import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

export enum EscrowPaymentStatus {
  INITIATED = 'initiated',
  HELD = 'held',
  RELEASED = 'released',
  REFUNDED = 'refunded',
  DISPUTED = 'disputed',
  CANCELLED = 'cancelled',
}

@Entity('escrow_payments')
export class EscrowPayment {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'listing_id', nullable: true })
  listingId: string | null

  @Column({ name: 'auction_id', nullable: true })
  auctionId: string | null

  @Column({ name: 'order_id', nullable: true })
  orderId: string | null

  @Column({ name: 'buyer_id' })
  buyerId: string

  @Column({ name: 'seller_id' })
  sellerId: string

  @Column('decimal', { precision: 15, scale: 2 })
  amount: number

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  fee: number

  @Column({
    type: 'enum',
    enum: EscrowPaymentStatus,
    default: EscrowPaymentStatus.INITIATED,
  })
  status: EscrowPaymentStatus

  @Column({ nullable: true })
  authority: string | null

  @Column({ name: 'payment_url', nullable: true })
  paymentUrl: string | null

  @Column({ name: 'tracking_code', nullable: true })
  trackingCode: string | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
