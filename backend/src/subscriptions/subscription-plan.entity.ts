import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'

export enum SubscriptionPlanLevel {
  SILVER = 'silver',
  GOLD = 'gold',
  DIAMOND = 'diamond',
  PREMIUM = 'premium',
  PRO = 'pro',
  VIP = 'vip',
}

@Entity('subscription_plans')
export class SubscriptionPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  name: string

  @Column({
    type: 'enum',
    enum: SubscriptionPlanLevel,
    default: SubscriptionPlanLevel.SILVER,
  })
  level: SubscriptionPlanLevel

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  price: number

  @Column({ default: 30, name: 'duration_days' })
  durationDays: number

  @Column('simple-json', { nullable: true })
  features: string[] | null

  @Column({ default: true, name: 'is_active' })
  isActive: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
