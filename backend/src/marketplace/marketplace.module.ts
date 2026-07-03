import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { UsedGoldListing } from './used-gold-listing.entity'
import { User } from '../users/user.entity'
import { UsedGoldListingsController } from './used-gold-listings.controller'
import { UsedGoldListingsService } from './used-gold-listings.service'

@Module({
  imports: [TypeOrmModule.forFeature([UsedGoldListing, User])],
  controllers: [UsedGoldListingsController],
  providers: [UsedGoldListingsService],
  exports: [UsedGoldListingsService],
})
export class MarketplaceModule {}
