import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('design_saves')
export class DesignSave {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'user_id' })
  userId: string

  @Column({ name: 'post_id', nullable: true })
  postId: string | null

  @Column({ name: 'design_id', nullable: true })
  designId: string | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
