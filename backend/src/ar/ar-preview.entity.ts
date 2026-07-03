import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('ar_previews')
export class ArPreview {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'user_id' })
  userId: string

  @Column({ name: 'model_id' })
  modelId: string

  @Column({ nullable: true })
  screenshot_url: string | null

  @Column({ nullable: true })
  video_url: string | null

  @Column({ default: false, name: 'is_shared' })
  isShared: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
