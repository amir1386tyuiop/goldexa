import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Unique } from 'typeorm'

@Unique('one_vote_per_user_per_post', ['postId', 'userId'])
@Entity('design_votes')
export class DesignVote {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'post_id' })
  postId: string

  @Column({ name: 'user_id' })
  userId: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
