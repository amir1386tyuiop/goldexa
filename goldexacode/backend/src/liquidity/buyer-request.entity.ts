import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

export enum BuyerRequestStatus {
  OPEN = 'open',
  MATCHED = 'matched',
  CLOSED = 'closed',
}

@Entity('buyer_requests')
export class BuyerRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'user_id' })
  userId: string

  @Column({ name: 'category', nullable: true })
  category: string | null

  @Column('decimal', { precision: 15, scale: 2, default: 0, name: 'min_weight' })
  minWeight: number

  @Column('decimal', { precision: 15, scale: 2, default: 0, name: 'max_weight' })
  maxWeight: number

  @Column('decimal', { precision: 15, scale: 2, default: 0, name: 'budget' })
  budget: number

  @Column({
    type: 'enum',
    enum: BuyerRequestStatus,
    default: BuyerRequestStatus.OPEN,
  })
  status: BuyerRequestStatus

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
