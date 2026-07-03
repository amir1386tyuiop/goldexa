import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Auction } from './auction.entity'
import { AuctionBid } from './auction-bid.entity'
import { Product } from '../products/product.entity'
import { User } from '../users/user.entity'
import { AuctionsController } from './auctions.controller'
import { AuctionsService } from './auctions.service'

@Module({
  imports: [TypeOrmModule.forFeature([Auction, AuctionBid, Product, User])],
  controllers: [AuctionsController],
  providers: [AuctionsService],
  exports: [AuctionsService],
})
export class AuctionsModule {}
