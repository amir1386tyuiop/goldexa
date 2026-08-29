import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { EscrowController } from './escrow.controller'
import { EscrowService } from './escrow.service'
import { EscrowPayment } from './escrow-payment.entity'
import { MarketplaceRating } from './marketplace-rating.entity'
import { UsedGoldListing } from '../marketplace/used-gold-listing.entity'
import { Auction } from '../auctions/auction.entity'
import { WalletModule } from '../wallet/wallet.module'

@Module({
  imports: [TypeOrmModule.forFeature([EscrowPayment, MarketplaceRating, UsedGoldListing, Auction]), WalletModule],
  controllers: [EscrowController],
  providers: [EscrowService],
})
export class EscrowModule {}
