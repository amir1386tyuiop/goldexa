import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('ai_service_metrics')
export class AiServiceMetric {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  name: string

  @Column('decimal', { precision: 15, scale: 4 })
  value: number

  @Column('simple-json', { default: {} })
  metadata: unknown

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
