import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('ad_campaigns')
export class AdCampaign {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  title: string

  @Column({ name: 'brand_name' })
  brandName: string

  @Column('text', { nullable: true })
  description: string | null

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  budget: number

  @Column({ default: true, name: 'is_active' })
  isActive: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
