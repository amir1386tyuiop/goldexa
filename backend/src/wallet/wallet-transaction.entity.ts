import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

export enum WalletTransactionType {
  DEPOSIT = 'deposit',
  PAYMENT = 'payment',
  REFUND = 'refund',
  BUY = 'buy',
  SELL = 'sell',
  ESCROW_HOLD = 'escrow_hold',
  ESCROW_RELEASE = 'escrow_release',
  PAYOUT_HOLD = 'payout_hold',
  PAYOUT_REFUND = 'payout_refund',
  GROUP_BUYING_PAYMENT = 'group_buying_payment',
  GROUP_BUYING_REFUND = 'group_buying_refund',
  COMMUNITY_REWARD = 'community_reward',
}

@Entity('wallet_transactions')
export class WalletTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'wallet_id' })
  walletId: string

  @Column({ name: 'user_id' })
  userId: string

  @Column({
    type: 'enum',
    enum: WalletTransactionType,
  })
  type: WalletTransactionType

  @Column('decimal', { precision: 15, scale: 2 })
  amount: number

  @Column('decimal', { name: 'amount_grams', precision: 15, scale: 4, default: 0 })
  amountGrams: number

  @Column({ name: 'order_id', nullable: true })
  orderId: string | null

  @Column({ name: 'escrow_id', nullable: true })
  escrowId: string | null

  @Column({ name: 'payout_request_id', nullable: true })
  payoutRequestId: string | null

  @Column({ name: 'group_buying_member_id', nullable: true })
  groupBuyingMemberId: string | null

  @Column({ name: 'reward_id', nullable: true })
  rewardId: string | null

  @Column({ nullable: true })
  description: string | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
