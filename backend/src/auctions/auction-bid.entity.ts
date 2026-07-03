import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm'
import { Auction } from './auction.entity'

@Entity('auction_bids')
export class AuctionBid {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'auction_id' })
  auctionId: string

  @Column({ name: 'bidder_id' })
  bidderId: string

  @Column({ name: 'bidder_name' })
  bidderName: string

  @Column('decimal', { precision: 15, scale: 2 })
  amount: number

  @Column({ default: false, name: 'is_winning' })
  isWinning: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @ManyToOne(() => Auction, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'auction_id' })
  auction: Auction
}
