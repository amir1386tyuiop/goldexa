import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('challenge_rewards')
export class ChallengeReward {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'challenge_id' })
  challengeId: string

  @Column({ name: 'post_id', nullable: true })
  postId: string | null

  @Column({ name: 'user_id' })
  userId: string

  @Column({ name: 'reward_type' })
  rewardType: string

  @Column('decimal', { name: 'reward_value', precision: 15, scale: 2, default: 0 })
  rewardValue: number

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
