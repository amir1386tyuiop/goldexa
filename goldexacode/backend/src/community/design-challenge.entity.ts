import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'

export enum DesignChallengeStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ENDED = 'ended',
  CANCELLED = 'cancelled',
}

@Entity('design_challenges')
export class DesignChallenge {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  title: string

  @Column('text')
  description: string

  @Column()
  theme: string

  @Column({ name: 'start_date' })
  startDate: Date

  @Column({ name: 'end_date' })
  endDate: Date

  @Column({ name: 'reward_type', nullable: true })
  rewardType: string | null

  @Column('decimal', { precision: 15, scale: 2, default: 0, name: 'reward_value' })
  rewardValue: number

  @Column({
    type: 'enum',
    enum: DesignChallengeStatus,
    default: DesignChallengeStatus.DRAFT,
  })
  status: DesignChallengeStatus

  @Column({ name: 'winner_post_id', nullable: true })
  winnerPostId: string | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
