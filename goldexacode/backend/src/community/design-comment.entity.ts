import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm'

@Entity('design_comments')
export class DesignComment {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'post_id' })
  postId: string

  @Column({ name: 'user_id' })
  userId: string

  @Column({ name: 'user_name' })
  userName: string

  @Column('text')
  body: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
