import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('stones')
export class Stone {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  name: string

  @Column()
  type: string

  @Column({ nullable: true })
  color: string | null

  @Column('decimal', { precision: 12, scale: 2, name: 'price_per_carat' })
  pricePerCarat: number

  @Column({ default: true, name: 'is_active' })
  isActive: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
