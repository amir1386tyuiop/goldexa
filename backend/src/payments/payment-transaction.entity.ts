import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

export enum PaymentTransactionStatus {
  INITIATED = 'initiated',
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

@Entity('payment_transactions')
export class PaymentTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'order_id', nullable: true })
  orderId: string | null

  @Column({ name: 'auction_id', nullable: true })
  auctionId: string | null

  @Column({ name: 'escrow_id', nullable: true })
  escrowId: string | null

  @Column({ name: 'user_id' })
  userId: string

  @Column('decimal', { precision: 15, scale: 2 })
  amount: number

  @Column({ name: 'payment_method' })
  paymentMethod: string

  @Column({
    type: 'enum',
    enum: PaymentTransactionStatus,
    default: PaymentTransactionStatus.INITIATED,
  })
  status: PaymentTransactionStatus

  @Column({ nullable: true })
  authority: string | null

  @Column({ name: 'reference_id', nullable: true })
  referenceId: string | null

  @Column({ name: 'tracking_code', nullable: true })
  trackingCode: string | null

  @Column({ name: 'idempotency_key', nullable: true })
  idempotencyKey: string | null

  @Column({ name: 'paid_at', nullable: true })
  paidAt: Date | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
