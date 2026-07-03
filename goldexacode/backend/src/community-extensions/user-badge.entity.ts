import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('user_badges')
export class UserBadge {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'user_id' })
  userId: string

  @Column()
  name: string

  @Column({ nullable: true })
  description: string | null

  @Column({ nullable: true })
  icon_url: string | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
