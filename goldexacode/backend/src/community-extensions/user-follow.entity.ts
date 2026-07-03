import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('user_follows')
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
