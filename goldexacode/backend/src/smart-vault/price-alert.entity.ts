import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm'

export enum PriceAlertTargetType {
  GOLD_PRICE = 'gold_price',
  ASSET = 'asset',
  PORTFOLIO = 'portfolio',
}

@Entity('price_alerts')
export class PriceAlert {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'user_id' })
  userId: string

  @Column({
    type: 'enum',
    enum: PriceAlertTargetType,
    default: PriceAlertTargetType.GOLD_PRICE,
    name: 'target_type',
  })
  targetType: PriceAlertTargetType

  @Column({ name: 'target_id', nullable: true })
  targetId: string | null

  @Column('decimal', { precision: 15, scale: 2, name: 'target_price' })
  targetPrice: number

  @Column({ default: 'greater_than_or_equal', name: 'trigger_condition' })
  triggerCondition: string

  @Column({ default: true, name: 'is_active' })
  isActive: boolean

  @Column({ name: 'notified_at', nullable: true })
  notifiedAt: Date | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
