import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

@Entity('seller_profiles')
export class SellerProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'user_id' })
  userId: string

  @Column({ name: 'store_name' })
  storeName: string

  @Column({ nullable: true })
  description: string | null

  @Column({ nullable: true })
  location: string | null

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  rating: number

  @Column({ default: true, name: 'is_verified' })
  isVerified: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
