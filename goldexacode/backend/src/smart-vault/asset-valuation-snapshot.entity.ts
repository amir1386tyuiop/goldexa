import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm'

@Entity('asset_valuation_snapshots')
export class AssetValuationSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'asset_id' })
  assetId: string

  @Column({ name: 'user_id' })
  userId: string

  @Column('decimal', { precision: 15, scale: 2, name: 'raw_gold_value' })
  rawGoldValue: number

  @Column('decimal', { precision: 15, scale: 2, name: 'total_value' })
  totalValue: number

  @Column('decimal', { precision: 15, scale: 2, default: 0, name: 'profit_loss' })
  profitLoss: number

  @Column('decimal', { precision: 15, scale: 2, name: 'gold_price' })
  goldPrice: number

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
