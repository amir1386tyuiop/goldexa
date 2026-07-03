import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('pricing_rules')
export class PricingRule {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  name: string

  @Column({ nullable: true })
  description: string | null

  @Column('decimal', { name: 'labor_rate', precision: 15, scale: 2, default: 0 })
  laborRate: number

  @Column('decimal', { name: 'profit_rate', precision: 15, scale: 2, default: 0 })
  profitRate: number

  @Column('decimal', { name: 'tax_rate', precision: 5, scale: 2, default: 9 })
  taxRate: number

  @Column({ default: true, name: 'is_active' })
  isActive: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
