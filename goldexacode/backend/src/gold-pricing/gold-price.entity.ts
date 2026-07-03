import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm'

export enum GoldPriceType {
  MIZANEH = 'mizaneh',
  COIN = 'coin',
  OUNCE = 'ounce',
  GOLD_18 = 'gold18',
}

@Entity('gold_prices')
export class GoldPrice {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({
    type: 'enum',
    enum: GoldPriceType,
  })
  type: GoldPriceType

  @Column('decimal', { precision: 15, scale: 2 })
  value: number

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  change: number

  @Column('decimal', { precision: 5, scale: 2, default: 0, name: 'change_percent' })
  changePercent: number

  @Column({ default: true, name: 'is_valid' })
  isValid: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @Column({ default: () => 'CURRENT_TIMESTAMP', name: 'updated_at' })
  updatedAt: Date
}
