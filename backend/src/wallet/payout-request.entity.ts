import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

export enum PayoutRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  PROCESSING = 'processing',
  PAID = 'paid',
  REJECTED = 'rejected',
  FAILED = 'failed',
}

@Entity('payout_requests')
export class PayoutRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'user_id' })
  userId: string

  @Column({ name: 'bank_account_id' })
  bankAccountId: string

  @Column('decimal', { precision: 15, scale: 2 })
  amount: number

  @Column({ type: 'enum', enum: PayoutRequestStatus, default: PayoutRequestStatus.PENDING })
  status: PayoutRequestStatus

  @Column({ name: 'idempotency_key', length: 100, unique: true })
  idempotencyKey: string

  @Column({ name: 'provider_reference', nullable: true })
  providerReference: string | null

  @Column({ name: 'failure_reason', nullable: true })
  failureReason: string | null

  @Column({ name: 'reviewed_by', nullable: true })
  reviewedBy: string | null

  @Column({ name: 'reviewed_at', nullable: true })
  reviewedAt: Date | null

  @Column({ name: 'paid_at', nullable: true })
  paidAt: Date | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
