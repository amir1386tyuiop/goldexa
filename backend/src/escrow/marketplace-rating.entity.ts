import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('marketplace_ratings')
export class MarketplaceRating {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'reviewer_id' })
  reviewerId: string

  @Column({ name: 'reviewee_id' })
  revieweeId: string

  @Column({ name: 'listing_id', nullable: true })
  listingId: string | null

  @Column({ name: 'order_id', nullable: true })
  orderId: string | null

  @Column({ default: 5 })
  rating: number

  @Column({ nullable: true })
  body: string | null

  @Column()
  category: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
