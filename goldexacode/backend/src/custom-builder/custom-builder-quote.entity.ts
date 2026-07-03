import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

export enum CustomBuilderQuoteStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

@Entity('custom_builder_quotes')
export class CustomBuilderQuote {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'design_id', nullable: true })
  designId: string | null

  @Column({ name: 'user_id' })
  userId: string

  @Column('decimal', { precision: 15, scale: 2, name: 'gold_price_snapshot' })
  goldPriceSnapshot: number

  @Column('decimal', { precision: 10, scale: 2, name: 'gold_weight' })
  goldWeight: number

  @Column('decimal', { precision: 15, scale: 2, name: 'labor_cost' })
  laborCost: number

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  profit: number

  @Column('decimal', { precision: 15, scale: 2, default: 9 })
  tax: number

  @Column('decimal', { precision: 15, scale: 2 })
  total: number

  @Column({ name: 'expires_at', nullable: true })
  expiresAt: Date | null

  @Column({
    type: 'enum',
    enum: CustomBuilderQuoteStatus,
    default: CustomBuilderQuoteStatus.DRAFT,
  })
  status: CustomBuilderQuoteStatus

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
