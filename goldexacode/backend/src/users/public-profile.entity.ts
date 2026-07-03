import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

@Entity('public_profiles')
export class PublicProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'user_id' })
  userId: string

  @Column({ name: 'display_name' })
  displayName: string

  @Column({ nullable: true })
  tagline: string | null

  @Column({ nullable: true })
  avatar_url: string | null

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  rating: number

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
