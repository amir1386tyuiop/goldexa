import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('tax_rules')
export class TaxRule {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'product_category', nullable: true })
  productCategory: string | null

  @Column('decimal', { name: 'tax_rate', precision: 5, scale: 2 })
  taxRate: number

  @Column({ default: true, name: 'is_active' })
  isActive: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
