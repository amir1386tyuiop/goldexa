import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('ai_design_recommendations')
export class AiDesignRecommendation {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'user_id' })
  userId: string

  @Column({ name: 'design_id', nullable: true })
  designId: string | null

  @Column('uuid', { name: 'product_ids', array: true, default: () => 'ARRAY[]::uuid[]' })
  productIds: string[]

  @Column('decimal', { precision: 5, scale: 2 })
  score: number

  @Column()
  reason: string

  @Column()
  source: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
