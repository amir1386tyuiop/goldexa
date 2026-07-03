import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('labor_cost_rules')
export class LaborCostRule {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'product_category' })
  productCategory: string

  @Column('decimal', { precision: 15, scale: 2, name: 'base_labor' })
  baseLabor: number

  @Column('decimal', { precision: 15, scale: 2, name: 'per_gram_labor' })
  perGramLabor: number

  @Column({ default: true, name: 'is_active' })
  isActive: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
