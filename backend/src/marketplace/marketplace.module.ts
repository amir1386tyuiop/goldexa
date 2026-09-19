import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { UsedGoldListing } from './used-gold-listing.entity'
import { User } from '../users/user.entity'
import { Order } from '../orders/order.entity'
import { EscrowPayment } from '../escrow/escrow-payment.entity'
import { WalletModule } from '../wallet/wallet.module'
import { UsedGoldListingsController } from './used-gold-listings.controller'
import { UsedGoldListingsService } from './used-gold-listings.service'

@Module({
  imports: [TypeOrmModule.forFeature([UsedGoldListing, User, Order, EscrowPayment]), WalletModule],
  controllers: [UsedGoldListingsController],
  providers: [UsedGoldListingsService],
  exports: [UsedGoldListingsService],
})
export class MarketplaceModule {}
