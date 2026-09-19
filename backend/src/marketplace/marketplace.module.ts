import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { UsedGoldListing } from './used-gold-listing.entity'
import { User } from '../users/user.entity'
import { Order } from '../orders/order.entity'
import { EscrowPayment } from '../escrow/escrow-payment.entity'
import { SmartVaultAsset } from '../smart-vault/smart-vault-asset.entity'
import { WalletModule } from '../wallet/wallet.module'
import { UsedGoldListingsController } from './used-gold-listings.controller'
import { UsedGoldListingsService } from './used-gold-listings.service'
import { GoldPricingModule } from '../gold-pricing/gold-pricing.module'

@Module({
  imports: [TypeOrmModule.forFeature([UsedGoldListing, User, Order, EscrowPayment, SmartVaultAsset]), WalletModule, GoldPricingModule],
  controllers: [UsedGoldListingsController],
  providers: [UsedGoldListingsService],
  exports: [UsedGoldListingsService],
})
export class MarketplaceModule {}
