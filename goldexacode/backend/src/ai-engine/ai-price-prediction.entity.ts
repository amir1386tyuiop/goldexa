import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('ai_price_predictions')
export class AiPricePrediction {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'target_type' })
  targetType: string

  @Column({ name: 'target_id', nullable: true })
  targetId: string | null

  @Column('decimal', { precision: 15, scale: 2, name: 'current_price' })
  currentPrice: number

  @Column('decimal', { precision: 15, scale: 2, name: 'predicted_price' })
  predictedPrice: number

  @Column('decimal', { precision: 5, scale: 2, name: 'confidence_score' })
  confidenceScore: number

  @Column({ name: 'horizon_days' })
  horizonDays: number

  @Column({ name: 'model_version' })
  modelVersion: string

  @Column('simple-json', { default: {} })
  features: unknown

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
