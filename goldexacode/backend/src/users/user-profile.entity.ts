import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

@Entity('user_profiles')
export class UserProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'user_id' })
  userId: string

  @Column({ nullable: true })
  avatar_url: string | null

  @Column({ nullable: true })
  bio: string | null

  @Column({ nullable: true })
  birth_date: Date | null

  @Column({ default: true, name: 'is_public' })
  isPublic: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
