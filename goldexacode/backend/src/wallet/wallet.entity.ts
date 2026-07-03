import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

@Entity('wallets')
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'user_id' })
  userId: string

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  balance: number

  @Column('decimal', { precision: 15, scale: 4, default: 0, name: 'gold_balance_grams' })
  goldBalanceGrams: number

  @Column({ default: true, name: 'is_active' })
  isActive: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
