import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

@Entity('user_follows')
@Index('IDX_user_follows_pair_unique', ['followerId', 'followingId'], { unique: true })
export class UserFollow {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'follower_id' })
  followerId: string

  @Column({ name: 'following_id' })
  followingId: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
