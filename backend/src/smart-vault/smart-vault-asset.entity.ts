import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'

@Entity('smart_vault_assets')
export class SmartVaultAsset {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'user_id' })
  userId: string

  @Column({ name: 'product_id', nullable: true })
  productId: string | null

  @Column({ name: 'order_id', nullable: true })
  orderId: string | null

  @Column()
  name: string

  @Column({ nullable: true })
  category: string | null

  @Column('decimal', { precision: 10, scale: 2 })
  weight: number

  @Column({ type: 'int', default: 18 })
  karat: number

  @Column('decimal', { precision: 15, scale: 2, name: 'purchase_price' })
  purchasePrice: number

  @Column({ name: 'purchase_date' })
  purchaseDate: Date

  @Column('decimal', { precision: 15, scale: 2, default: 0, name: 'current_raw_gold_value' })
  currentRawGoldValue: number

  @Column('decimal', { precision: 15, scale: 2, default: 0, name: 'current_value' })
  currentValue: number

  @Column('decimal', { precision: 15, scale: 2, default: 0, name: 'profit_loss' })
  profitLoss: number

  @Column('decimal', { precision: 5, scale: 2, default: 0, name: 'profit_loss_percent' })
  profitLossPercent: number

  @Column('simple-array', { default: '' })
  images: string[]

  @Column('simple-json', { nullable: true })
  metadata: unknown

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
