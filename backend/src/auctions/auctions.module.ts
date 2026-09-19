import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Auction } from './auction.entity'
import { AuctionBid } from './auction-bid.entity'
import { Product } from '../products/product.entity'
import { User } from '../users/user.entity'
import { AuctionsController } from './auctions.controller'
import { AuctionsService } from './auctions.service'
import { AuctionsGateway } from './auctions.gateway'
import { NotificationsModule } from '../notifications/notifications.module'
import { GoldPricingModule } from '../gold-pricing/gold-pricing.module'

@Module({
  imports: [TypeOrmModule.forFeature([Auction, AuctionBid, Product, User]), NotificationsModule, GoldPricingModule],
  controllers: [AuctionsController],
  providers: [AuctionsService, AuctionsGateway],
  exports: [AuctionsService],
})
export class AuctionsModule {}
