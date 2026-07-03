import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('promotions')
export class Promotion {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  title: string

  @Column('text', { nullable: true })
  description: string | null

  @Column('decimal', { name: 'discount_value', precision: 15, scale: 2, default: 0 })
  discountValue: number

  @Column({ name: 'discount_type', default: 'percent' })
  discountType: string

  @Column({ default: true, name: 'is_active' })
  isActive: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
