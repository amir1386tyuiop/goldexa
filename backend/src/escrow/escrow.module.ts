import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { EscrowController } from './escrow.controller'
import { EscrowService } from './escrow.service'
import { EscrowPayment } from './escrow-payment.entity'
import { MarketplaceRating } from './marketplace-rating.entity'
import { UsedGoldListing } from '../marketplace/used-gold-listing.entity'
import { Auction } from '../auctions/auction.entity'
import { WalletModule } from '../wallet/wallet.module'
import { SmartVaultAsset } from '../smart-vault/smart-vault-asset.entity'
import { PlatformRevenue } from '../finance/platform-revenue.entity'

@Module({
  imports: [TypeOrmModule.forFeature([EscrowPayment, MarketplaceRating, UsedGoldListing, Auction, SmartVaultAsset, PlatformRevenue]), WalletModule],
  controllers: [EscrowController],
  providers: [EscrowService],
  exports: [EscrowService],
})
export class EscrowModule {}
