import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'

export enum DesignPostStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  HIDDEN = 'hidden',
}

@Entity('design_posts')
export class DesignPost {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'user_id' })
  userId: string

  @Column({ name: 'user_name' })
  userName: string

  @Column()
  title: string

  @Column('text')
  description: string

  @Column({ name: 'image_url', nullable: true })
  imageUrl: string | null

  @Column({ name: 'model_url', nullable: true })
  modelUrl: string | null

  @Column({ name: 'challenge_id', nullable: true })
  challengeId: string | null

  @Column({ default: 0, name: 'likes_count' })
  likesCount: number

  @Column({ default: 0, name: 'comments_count' })
  commentsCount: number

  @Column({
    type: 'enum',
    enum: DesignPostStatus,
    default: DesignPostStatus.PUBLISHED,
  })
  status: DesignPostStatus

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
